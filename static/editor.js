// ===== 顶级索引 · 自研文章后台 =====
// 登录复用 /auth（GitHub OAuth 握手），数据走 /api/v3（GitHub API 反代）
(() => {
  'use strict';

  const REPO = 'gaomeluo/inurl-top';
  const CONTENT_DIR = 'content';
  const TOKEN_KEY = 'inurl_editor_token';

  const $ = (id) => document.getElementById(id);
  const gate = $('login-gate');
  const app = $('app');
  const postList = $('post-list');
  const listLoading = $('list-loading');
  const searchInput = $('search');
  const emptyEl = $('empty');
  const editorEl = $('editor');
  const gutter = $('gutter');
  const bodyEl = $('body');
  const previewEl = $('preview');
  const statusEl = $('status');
  const userEl = $('user');
  const editArea = $('edit-area');
  const toastEl = $('toast');

  const fTitle = $('f-title');
  const fSlug = $('f-slug');
  const fTags = $('f-tags');
  const fCats = $('f-cats');
  const fCover = $('f-cover');
  const fDate = $('f-date');

  let current = null;     // { path, sha, fm, body, dirty, isNew }
  let allPosts = [];

  // ---------- 工具 ----------
  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.className = 'toast'; }, 2800);
  }
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob(b64.replace(/\s/g, '')))); }
  function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // ---------- Auth（复用 /auth 握手） ----------
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearAuth() { localStorage.removeItem(TOKEN_KEY); }

  function onAuthMessage(e) {
    if (e.origin !== location.origin) return;
    // Decap 握手：弹窗先发 authorizing:github，父窗回显后才跳 GitHub
    if (e.data === 'authorizing:github') {
      if (e.source) { try { e.source.postMessage('authorizing:github', e.origin); } catch (_) {} }
      return;
    }
    const s = typeof e.data === 'string' ? e.data : '';
    if (s.startsWith('authorization:github:success:')) {
      try {
        const payload = JSON.parse(s.slice('authorization:github:success:'.length));
        if (payload && payload.token) {
          setToken(payload.token);
          window.removeEventListener('message', onAuthMessage);
          onLoggedIn();
        }
      } catch (_) {}
    } else if (s.startsWith('authorization:github:error:')) {
      toast('登录失败，请重试', 'err');
    }
  }

  function login() {
    window.addEventListener('message', onAuthMessage);
    const w = window.open('/auth', 'inurl_oauth', 'width=600,height=720');
    if (!w) toast('浏览器拦截了登录弹窗，请允许弹窗后重试', 'err');
  }

  async function onLoggedIn() {
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    try {
      const r = await gh('user');
      userEl.textContent = r.login ? '@' + r.login : '(已登录)';
    } catch (_) { userEl.textContent = '(已登录)'; }
    try { await loadPosts(); }
    catch (err) {
      if (!getToken()) { location.reload(); return; }
      toast(err.message || '加载失败', 'err');
    }
  }

  function logout() { clearAuth(); location.reload(); }

  // ---------- GitHub API（经 /api/v3 反代） ----------
  async function gh(path, opts = {}) {
    const token = getToken();
    if (!token) throw new Error('未登录');
    const headers = { 'Accept': 'application/vnd.github+json' };
    headers['Authorization'] = 'token ' + token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/v3/repos/' + REPO + '/' + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      let msg = 'GitHub API ' + res.status;
      try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (_) {}
      if (res.status === 401) { clearAuth(); msg = '登录已失效，请重新登录'; }
      throw new Error(msg);
    }
    return res.json();
  }

  async function walkDir(dir) {
    const items = await gh('contents/' + dir);
    let files = [];
    for (const it of items) {
      if (it.type === 'file' && /\.md$/i.test(it.name)) files.push(it);
      else if (it.type === 'dir') files = files.concat(await walkDir(it.path));
    }
    return files;
  }

  function prettyName(name) { return name.replace(/\.md$/i, '').replace(/[-_]/g, ' '); }

  async function loadPosts() {
    listLoading.classList.remove('hidden');
    postList.innerHTML = '';
    try {
      allPosts = await walkDir(CONTENT_DIR);
      await Promise.all(allPosts.map(async (p) => {
        try {
          const d = await gh('contents/' + p.path);
          if (d.content) {
            const raw = b64decode(d.content);
            const fm = parseFM(raw).fm;
            p.title = (fm.title && String(fm.title)) || prettyName(p.name);
            p.date = fm.date || '';
          }
        } catch (_) { p.title = prettyName(p.name); }
      }));
      allPosts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      renderList();
    } catch (err) {
      toast(err.message || '加载失败', 'err');
    } finally {
      listLoading.classList.add('hidden');
    }
  }

  function renderList(filter) {
    const kw = (filter || '').trim().toLowerCase();
    postList.innerHTML = '';
    const list = allPosts.filter(p => !kw || p.title.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw));
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'list-loading';
      li.textContent = kw ? '无匹配文章' : '暂无文章';
      postList.appendChild(li);
      return;
    }
    for (const p of list) {
      const li = document.createElement('li');
      li.className = 'post-item' + (current && current.path === p.path ? ' active' : '');
      li.innerHTML = '<div class="post-name"></div><div class="post-meta"></div>';
      li.querySelector('.post-name').textContent = p.title;
      li.querySelector('.post-meta').textContent = p.path;
      li.addEventListener('click', () => openPost(p));
      postList.appendChild(li);
    }
  }

  // ---------- Front matter ----------
  function parseFM(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, body: raw };
    const fmText = m[1];
    const body = raw.slice(m[0].length);
    const fm = {};
    fmText.split(/\r?\n/).forEach((line) => {
      const mm = line.match(/^([\w-]+):\s*(.*)$/);
      if (!mm) return;
      let key = mm[1], val = mm[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else {
        val = val.replace(/^["']|["']$/g, '');
      }
      fm[key] = val;
    });
    return { fm, body };
  }

  function serializeFM(fm, body) {
    const lines = ['---'];
    for (const k of Object.keys(fm)) {
      let v = fm[k];
      if (Array.isArray(v)) {
        lines.push(k + ': [' + v.map(s => '"' + String(s).replace(/"/g, '\\"') + '"').join(', ') + ']');
      } else {
        v = String(v);
        const needQuote = /[:#\[\]{}"']/.test(v) || v === '';
        lines.push(k + ': ' + (needQuote ? '"' + v.replace(/"/g, '\\"') + '"' : v));
      }
    }
    lines.push('---');
    return lines.join('\n') + '\n\n' + body;
  }

  // ---------- 打开 / 编辑 ----------
  async function openPost(p) {
    try {
      const d = await gh('contents/' + p.path);
      const raw = b64decode(d.content);
      const { fm, body } = parseFM(raw);
      current = { path: p.path, sha: d.sha, fm, body, dirty: false, isNew: false };
      fillForm(fm, body);
      enterEditor();
      setStatus('saved');
      renderList(searchInput.value);
    } catch (err) {
      toast(err.message || '打开失败', 'err');
    }
  }

  function fillForm(fm, body) {
    fTitle.value = fm.title || '';
    const m = (current && current.path || '').match(/^content\/(.+)\.md$/i);
    fSlug.value = m ? m[1] : '';
    fTags.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');
    fCats.value = Array.isArray(fm.categories) ? fm.categories.join(', ') : (fm.categories || '');
    fCover.value = fm.cover || '';
    fDate.value = (fm.date || '').slice(0, 10);
    bodyEl.value = body;
    updateGutter();
    renderPreview();
  }

  function collectFM() {
    // 保留原始 front matter 的全部字段，仅覆盖我们编辑的那几个
    const fm = Object.assign({}, (current && current.fm) || {});
    fm.title = fTitle.value.trim();
    const tags = fTags.value.split(',').map(s => s.trim()).filter(Boolean);
    if (tags.length) fm.tags = tags; else delete fm.tags;
    const cats = fCats.value.split(',').map(s => s.trim()).filter(Boolean);
    if (cats.length) fm.categories = cats; else delete fm.categories;
    if (fCover.value.trim()) fm.cover = fCover.value.trim(); else delete fm.cover;
    if (fDate.value) fm.date = fDate.value; else delete fm.date;
    return fm;
  }

  function currentPath() {
    let slug = fSlug.value.trim().replace(/^\/+|\.md$/g, '');
    if (!slug) slug = 'archives/untitled-' + Date.now();
    return 'content/' + slug + '.md';
  }

  function enterEditor() { emptyEl.classList.add('hidden'); editorEl.classList.remove('hidden'); }

  function setStatus(state) {
    statusEl.className = 'status' + (state === 'dirty' ? ' dirty' : state === 'saved' ? ' saved' : '');
    statusEl.textContent = state === 'dirty' ? '● 未保存' : state === 'saved' ? '✓ 已保存' : '';
  }
  function markDirty() {
    if (!current) return;
    current.body = bodyEl.value;
    current.dirty = true;
    setStatus('dirty');
  }

  // ---------- 预览 ----------
  let previewTimer = null;
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 250); }
  function renderPreview() {
    const src = bodyEl.value;
    if (!window.marked) {
      previewEl.innerHTML = '<p class="muted">预览需要加载 Markdown 渲染库（CDN），离线时暂不可用；编辑与保存不受影响。</p>';
      return;
    }
    let html;
    try { html = (marked.parse ? marked.parse(src) : marked(src)); }
    catch (_) { html = '<pre>' + escapeHtml(src) + '</pre>'; }
    previewEl.innerHTML = html;
    if (window.hljs) {
      previewEl.querySelectorAll('pre code').forEach((el) => { try { hljs.highlightElement(el); } catch (_) {} });
    }
  }

  // ---------- 行号 ----------
  function updateGutter() {
    const n = bodyEl.value.split('\n').length;
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    gutter.textContent = s;
    gutter.scrollTop = bodyEl.scrollTop;
  }

  // ---------- 增 / 删 / 改 ----------
  async function savePost() {
    if (!current) return;
    if (current.isNew && !fSlug.value.trim()) { toast('请填写路径 / Slug', 'err'); return; }
    const fm = collectFM();
    const raw = serializeFM(fm, bodyEl.value);
    const path = current.isNew ? currentPath() : current.path;
    $('btn-save').disabled = true;
    try {
      const payload = { message: (current.isNew ? 'create ' : 'update ') + path, content: b64encode(raw) };
      if (!current.isNew && current.sha) payload.sha = current.sha;
      await gh('contents/' + path, { method: 'PUT', body: payload });
      current.path = path;
      current.fm = fm;
      current.isNew = false;
      current.dirty = false;
      setStatus('saved');
      toast('已保存，部署中…', 'ok');
      const item = allPosts.find(p => p.path === path);
      if (item) { item.title = fm.title || prettyName(path); item.date = fm.date || ''; }
      else allPosts.push({ path, name: path.split('/').pop(), title: fm.title || prettyName(path), date: fm.date || '' });
      renderList(searchInput.value);
      try { const d = await gh('contents/' + path); current.sha = d.sha; } catch (_) {}
    } catch (err) {
      toast(err.message || '保存失败', 'err');
    } finally {
      $('btn-save').disabled = false;
    }
  }

  function newPost() {
    current = { path: null, sha: null, fm: {}, body: '', dirty: false, isNew: true };
    fTitle.value = '';
    fSlug.value = 'archives/untitled-' + Date.now().toString().slice(-6);
    fTags.value = ''; fCats.value = ''; fCover.value = '';
    fDate.value = new Date().toISOString().slice(0, 10);
    bodyEl.value = '';
    updateGutter(); renderPreview();
    enterEditor(); setStatus('dirty');
    toast('新建文章，填好信息后点「保存」', 'ok');
  }

  async function deletePost() {
    if (!current || current.isNew) { toast('这是未保存的新文章，无需删除', 'err'); return; }
    if (!confirm('确定删除《' + (current.fm.title || current.path) + '》？此操作不可撤销。')) return;
    try {
      await gh('contents/' + current.path, { method: 'DELETE', body: { message: 'delete ' + current.path, sha: current.sha } });
      allPosts = allPosts.filter(p => p.path !== current.path);
      current = null;
      editorEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      renderList(searchInput.value);
      toast('已删除', 'ok');
    } catch (err) {
      toast(err.message || '删除失败', 'err');
    }
  }

  // ---------- 事件绑定 ----------
  function bind() {
    $('btn-login').addEventListener('click', login);
    $('btn-logout').addEventListener('click', logout);
    $('btn-new').addEventListener('click', newPost);
    $('btn-save').addEventListener('click', savePost);
    $('btn-del').addEventListener('click', deletePost);
    searchInput.addEventListener('input', () => renderList(searchInput.value));
    bodyEl.addEventListener('input', () => { updateGutter(); schedulePreview(); markDirty(); });
    bodyEl.addEventListener('scroll', () => { gutter.scrollTop = bodyEl.scrollTop; });
    bodyEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = bodyEl.selectionStart, en = bodyEl.selectionEnd;
        bodyEl.value = bodyEl.value.slice(0, s) + '  ' + bodyEl.value.slice(en);
        bodyEl.selectionStart = bodyEl.selectionEnd = s + 2;
        markDirty();
      }
    });
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        editArea.className = 'edit-area mode-' + t.dataset.tab;
      });
    });
    window.addEventListener('beforeunload', (e) => {
      if (current && current.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  // ---------- 启动 ----------
  function init() {
    bind();
    editArea.className = 'edit-area mode-split';
    if (getToken()) onLoggedIn();
    else { gate.classList.remove('hidden'); app.classList.add('hidden'); }
  }

  init();
})();
