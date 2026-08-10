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
  const imgInput = $('img-input');

  const fTitle = $('f-title');
  const fSlug = $('f-slug');
  const fTags = $('f-tags');
  const fCats = $('f-cats');
  const fCover = $('f-cover');
  const fDate = $('f-date');

  let current = null;     // { path, sha, fm, body, dirty, isNew }
  let allPosts = [];
  let slugDirty = false;  // 用户是否手动改过 slug（true=停止跟随标题自动更新）

  // 分类 / 标签：中文显示 -> 存储 slug（Hugo 需要 slug）
  let catMap = {};   // { slug: 中文名 }
  let tagMap = {};   // { tag: 显示名 }
  const comboState = {
    tags: { input: 'f-tags', visible: 'f-tags-input', chips: 'chips-tags', menu: 'menu-tags' },
    cats: { input: 'f-cats', visible: 'f-cats-input', chips: 'chips-cats', menu: 'menu-cats' },
  };

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

  // Slug generation: strip Chinese/fullwidth punctuation, leave ASCII letters/digits/hyphens.
  // Example: "【教程】如何0成本使用聚合API Token管理你所有key" -> "0-api-token"
  function slugify(title) {
    if (!title) return '';
    let s = title
      .replace(/[\u3000-\u303f\uff00-\uffef]/g, ' ')
      .replace(/[\u4e00-\u9fff]/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s.slice(0, 60);
  }
  function autoSlug(title) { return slugify(title) || ('post-' + Date.now().toString(36)); }

  // ---------- Auth（复用 /auth 握手） ----------
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearAuth() { localStorage.removeItem(TOKEN_KEY); }

  function onAuthMessage(e) {
    if (e.origin !== location.origin) return;
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
    try { await loadPosts(); await gatherTaxonomies(); }
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
    // 仓库内接口走 /repos/{owner}/{repo}/...；
    // 取当前登录用户走 /user（不带仓库前缀，否则会变成无效路径）
    const base = path.startsWith('user')
      ? '/api/v3/'
      : '/api/v3/repos/' + REPO + '/';
    const res = await fetch(base + path, {
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
            p.slug = (fm.slug ? String(fm.slug) : '');
            p.date = fm.date || '';
            p.cats = Array.isArray(fm.categories) ? fm.categories : (fm.categories ? [fm.categories] : []);
            p.tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
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
      li.querySelector('.post-meta').textContent = p.slug ? 'archives/' + p.slug : displaySlug(p.path);
      li.addEventListener('click', () => openPost(p));
      postList.appendChild(li);
    }
  }

  // ---------- Front matter ----------
  // 轻量 YAML front matter 解析（支持：标量 / 内联数组 / 块列表 / 块标量）
  function parseFM(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, body: raw };
    const fmText = m[1];
    const body = raw.slice(m[0].length);
    const fm = {};
    const lines = fmText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const mm = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!mm) continue;                       // 缩进行 / 注释，跳过
      const key = mm[1];
      const val = mm[2].trim();
      // 块标量：description: |-  或  key: >
      if (/^[|>]-?$/.test(val)) {
        const start = i; i++;
        while (i < lines.length && /^[\t ]+/.test(lines[i])) i++;
        i--;
        fm[key] = { __block: true, text: lines.slice(start, i + 1).join('\n') };
        continue;
      }
      // 空值：可能是块列表（tags: / categories: 换行的写法）
      if (val === '') {
        const items = [];
        let j = i + 1;
        while (j < lines.length && /^[\t ]*-[\t ]+/.test(lines[j])) {
          items.push(lines[j].replace(/^[\t ]*-[\t ]+/, '').trim().replace(/^["']|["']$/g, ''));
          j++;
        }
        if (items.length) { fm[key] = items; i = j - 1; continue; }
        fm[key] = '';
        continue;
      }
      // 内联数组 [a, b]
      if (val.startsWith('[') && val.endsWith(']')) {
        fm[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        continue;
      }
      // 普通标量
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
    return { fm, body };
  }

  function serializeFM(fm, body) {
    const lines = ['---'];
    for (const k of Object.keys(fm)) {
      const v = fm[k];
      if (v && typeof v === 'object' && v.__block) { lines.push(v.text); continue; } // 块标量原样写回
      if (Array.isArray(v)) {
        lines.push(k + ': [' + v.map(s => '"' + String(s).replace(/"/g, '\\"') + '"').join(', ') + ']');
      } else {
        const sv = String(v);
        const needQuote = /[:#\[\]{}"']/.test(sv) || sv === '';
        lines.push(k + ': ' + (needQuote ? '"' + sv.replace(/"/g, '\\"') + '"' : sv));
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
    // 显示真实发布路径：优先用 front matter 里的 slug，否则用文件名派生
    fSlug.value = (fm.slug ? 'archives/' + fm.slug : displaySlug(current && current.path || ''));
    fSlug.readOnly = false;   // 已发布文章也允许修改发布路径
    slugDirty = true;         // 已有文章：不跟随标题自动改 slug
    fTags.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');
    fCats.value = Array.isArray(fm.categories) ? fm.categories.join(', ') : (fm.categories || '');
    renderChips('tags'); renderChips('cats');
    fCover.value = fm.cover || '';
    fDate.value = (fm.date || '').slice(0, 10);
    bodyEl.value = body;
    updateGutter();
    renderPreview();
  }

  function collectFM(publish) {
    const fm = Object.assign({}, (current && current.fm) || {});
    fm.title = fTitle.value.trim() || '无标题';
    // 发布路径 / slug：从 slug 框取值写入 front matter。
    // 已有文章改 slug 即改 URL（无需改文件名，安全）；新文章文件名也由它派生。
    const slugVal = fSlug.value.trim().replace(/^\/+|\.md$/g, '').replace(/^(archives|posts|content)\//i, '');
    if (slugVal) fm.slug = slugVal; else delete fm.slug;
    const tags = fTags.value.split(',').map(s => s.trim()).filter(Boolean);
    if (tags.length) fm.tags = tags; else delete fm.tags;
    const cats = fCats.value.split(',').map(s => s.trim()).filter(Boolean);
    if (cats.length) fm.categories = cats; else delete fm.categories;
    if (fCover.value.trim()) fm.cover = fCover.value.trim(); else delete fm.cover;
    if (fDate.value) fm.date = fDate.value; else delete fm.date;
    if (publish) {
      delete fm.draft;                                   // 发布：去掉草稿标记
      if (!fm.date) fm.date = new Date().toISOString().slice(0, 10);
    } else {
      fm.draft = true;                                   // 保存草稿
    }
    return fm;
  }

  function currentPath() {
    let slug = fSlug.value.trim().replace(/^\/+|\.md$/g, '');
    slug = slug.replace(/^(archives|posts|content)\//i, '');
    if (!slug) slug = 'untitled-' + Date.now();
    return 'content/posts/' + slug + '.md';
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
  // 把 slug 框里的展示值归一化为真正的磁盘路径（永远落 content/posts/，
  // 站点 permalinks 配置会把 /posts/:slug/ 重写为 /archives/:slug/）。
  function targetPath() {
    let v = fSlug.value.trim().replace(/^\/+|\.md$/g, '');
    v = v.replace(/^(archives|posts|content)\//i, '');
    if (!v) v = autoSlug(fTitle.value) || ('untitled-' + Date.now());
    return 'content/posts/' + v + '.md';
  }

  async function savePost(publish) {
    if (!current) return;
    if (!fSlug.value.trim() && current.isNew) { toast('请填写发布路径 / Slug', 'err'); return; }
    const fm = collectFM(publish);
    const raw = serializeFM(fm, bodyEl.value);
    const target = targetPath();
    const isNew = current.isNew;
    const isRename = !isNew && target !== current.path;
    setSaving(true);
    try {
      let actionLabel;
      if (isRename) {
        // 改名：先 PUT 新路径（无 sha = 创建），再 DELETE 旧路径
        // GitHub Contents API 不支持原地改名，必须两步走；这两步会生成两次 commit。
        const createPayload = {
          message: 'rename: ' + current.path + ' → ' + target,
          content: b64encode(raw),
        };
        const newRes = await gh('contents/' + target, { method: 'PUT', body: createPayload });
        await gh('contents/' + current.path, {
          method: 'DELETE',
          body: { message: 'rename to ' + target, sha: current.sha },
        });
        current.path = target;
        current.sha = newRes.content.sha;
        actionLabel = '已重命名并保存';
      } else {
        // 新建或原地更新
        const payload = {
          message: (isNew ? 'create ' : (publish ? 'publish ' : 'draft ')) + target,
          content: b64encode(raw),
        };
        if (!isNew && current.sha) payload.sha = current.sha;
        const res = await gh('contents/' + target, { method: 'PUT', body: payload });
        current.path = target;
        if (!isNew) current.sha = res.content.sha;
        actionLabel = publish ? '已发布' : '已存为草稿';
      }
      current.fm = fm;
      current.isNew = false;
      current.dirty = false;
      fSlug.readOnly = false;
      fSlug.value = (fm.slug ? 'archives/' + fm.slug : displaySlug(target));
      setStatus('saved');
      toast(actionLabel + '，部署中…', 'ok');
      const item = allPosts.find(p => p.path === current.path);
      if (item) {
        item.title = fm.title || prettyName(current.path);
        item.date = fm.date || '';
        item.slug = fm.slug || '';
        // 旧路径不在列表里了（如果是改名），同步移除
        const oldItem = allPosts.find(p => p.path === target && p !== item);
        if (oldItem) { /* no-op */ }
      } else {
        allPosts.push({ path: current.path, name: current.path.split('/').pop(), title: fm.title || prettyName(current.path), date: fm.date || '', slug: fm.slug || '' });
      }
      renderList(searchInput.value);
    } catch (err) {
      toast(err.message || '保存失败', 'err');
    } finally {
      setSaving(false);
    }
  }

  function setSaving(on) {
    $('btn-savedraft').disabled = on;
    $('btn-publish').disabled = on;
  }

  function newPost() {
    current = { path: null, sha: null, fm: {}, body: '', dirty: false, isNew: true };
    fTitle.value = '';
    slugDirty = false;                       // 新文章：让 slug 跟随标题自动生成
    fSlug.value = 'archives/' + autoSlug(''); // 标题为空时给一个回退值
    fSlug.readOnly = false;
    fSlug.placeholder = 'archives/your-slug（按标题自动生成，可手动改）';
    fTags.value = ''; fCats.value = ''; fCover.value = '';
    renderChips('tags'); renderChips('cats');
    fDate.value = new Date().toISOString().slice(0, 10);
    bodyEl.value = '';
    updateGutter(); renderPreview();
    enterEditor(); setStatus('dirty');
    toast('新建文章，填好信息后点「保存草稿」或「发布」', 'ok');
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

  // ---------- 路径显示（发布路径） ----------
  function displaySlug(path) {
    const m = (path || '').match(/^content\/(.+)\.md$/i);
    if (!m) return '';
    let rel = m[1];
    if (rel.startsWith('posts/')) rel = 'archives/' + rel.slice(6);
    return rel;
  }

  // ---------- 分类 / 标签下拉数据（中文显示，存储 slug） ----------
  async function fetchTitle(path) {
    try {
      const d = await gh('contents/' + path);
      if (d && d.content) return parseFM(b64decode(d.content)).fm.title || '';
    } catch (_) {}
    return '';
  }
  async function gatherTaxonomies() {
    catMap = {}; tagMap = {};
    // 1) 从已有文章汇总
    allPosts.forEach(p => {
      (p.cats || []).forEach(c => { if (c) catMap[c] = catMap[c] || c; });
      (p.tags || []).forEach(t => { if (t) tagMap[t] = tagMap[t] || t; });
    });
    // 2) 从分类目录的 _index.md 取中文名
    try {
      const items = await gh('contents/content/categories');
      if (Array.isArray(items)) {
        const dirs = items.filter(i => i.type === 'dir');
        await Promise.all(dirs.map(async (d) => {
          const title = await fetchTitle('content/categories/' + d.name + '/_index.md');
          if (title) catMap[d.name] = title; else if (!catMap[d.name]) catMap[d.name] = d.name;
        }));
      }
    } catch (_) {}
    // 3) 兜底已知中文名（防止接口异常）
    const fallback = { fuli: '福利', yuanquan: '猿圈' };
    Object.keys(fallback).forEach(s => { if (!catMap[s]) catMap[s] = fallback[s]; });
    // 4) 可选：标签目录中文名
    try {
      const items = await gh('contents/content/tags');
      if (Array.isArray(items)) {
        const dirs = items.filter(i => i.type === 'dir');
        await Promise.all(dirs.map(async (d) => {
          const title = await fetchTitle('content/tags/' + d.name + '/_index.md');
          if (title) tagMap[d.name] = title; else if (!tagMap[d.name]) tagMap[d.name] = d.name;
        }));
      }
    } catch (_) {}
  }
  function catOptions() { return Object.keys(catMap).map(k => ({ value: k, label: catMap[k] })); }
  function tagOptions() { return Object.keys(tagMap).map(k => ({ value: k, label: tagMap[k] })); }

  // ---------- 芯片下拉（标签 / 分类） ----------
  function renderChips(kind) {
    const st = comboState[kind];
    const box = $(st.chips);
    if (!box) return;
    const map = kind === 'tags' ? tagMap : catMap;
    const vals = ($(st.input).value || '').split(',').map(s => s.trim()).filter(Boolean);
    box.innerHTML = vals.map(v =>
      '<span class="chip">' + escapeHtml(map[v] || v) +
      '<button type="button" class="chip-x" data-val="' + escapeHtml(v) + '" aria-label="移除">×</button></span>'
    ).join('');
  }
  function addToken(kind, val) {
    val = (val || '').trim(); if (!val) return;
    const st = comboState[kind];
    const map = kind === 'tags' ? tagMap : catMap;
    if (!map[val]) map[val] = val;
    const cur = ($(st.input).value || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!cur.includes(val)) cur.push(val);
    $(st.input).value = cur.join(', ');
    $(st.visible).value = '';
    renderChips(kind);
    if (current) markDirty();
    $(st.visible).focus();
  }
  function removeToken(kind, val) {
    const st = comboState[kind];
    const cur = ($(st.input).value || '').split(',').map(s => s.trim()).filter(Boolean).filter(x => x !== val);
    $(st.input).value = cur.join(', ');
    renderChips(kind);
    if (current) markDirty();
  }
  function openMenu(kind) {
    const st = comboState[kind];
    const menu = $(st.menu);
    const q = ($(st.visible).value || '').trim().toLowerCase();
    const opts = (kind === 'tags' ? tagOptions() : catOptions())
      .filter(o => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    menu.innerHTML = opts.length
      ? opts.map(o =>
          '<li class="combo-opt" data-val="' + escapeHtml(o.value) + '">' +
          '<span class="combo-opt-label">' + escapeHtml(o.label) + '</span>' +
          (o.value !== o.label ? '<span class="combo-opt-sub">' + escapeHtml(o.value) + '</span>' : '') +
          '</li>'
        ).join('')
      : '<li class="combo-empty">无匹配，回车直接添加</li>';
    menu.hidden = false;
    $(st.visible).setAttribute('aria-expanded', 'true');
  }
  function closeMenu(kind) {
    const st = comboState[kind];
    $(st.menu).hidden = true;
    $(st.visible).setAttribute('aria-expanded', 'false');
  }
  function bindCombos() {
    ['tags', 'cats'].forEach((kind) => {
      const st = comboState[kind];
      const vin = $(st.visible);
      const menu = $(st.menu);
      const box = $(st.chips);
      vin.addEventListener('focus', () => openMenu(kind));
      vin.addEventListener('input', () => openMenu(kind));
      vin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addToken(kind, vin.value); }
        else if (e.key === 'Backspace' && !vin.value) {
          const cur = ($(st.input).value || '').split(',').map(s => s.trim()).filter(Boolean);
          if (cur.length) { cur.pop(); $(st.input).value = cur.join(', '); renderChips(kind); if (current) markDirty(); }
        } else if (e.key === 'Escape') { closeMenu(kind); }
      });
      menu.addEventListener('click', (e) => {
        const li = e.target.closest('.combo-opt'); if (!li) return;
        addToken(kind, li.dataset.val); closeMenu(kind);
      });
      box.addEventListener('click', (e) => {
        const b = e.target.closest('.chip-x'); if (!b) return;
        removeToken(kind, b.dataset.val);
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#combo-' + kind)) closeMenu(kind);
      });
    });
  }

  // ---------- 富文本工具栏（免写 Markdown） ----------
  function getSel() {
    return {
      s: bodyEl.selectionStart, e: bodyEl.selectionEnd,
      sel: bodyEl.value.substring(bodyEl.selectionStart, bodyEl.selectionEnd),
      val: bodyEl.value,
    };
  }
  function setVal(newVal, a, b) {
    bodyEl.value = newVal;
    bodyEl.selectionStart = a; bodyEl.selectionEnd = b;
    bodyEl.focus();
    updateGutter(); schedulePreview(); markDirty();
  }
  function wrap(before, after, ph) {
    const { s, e, sel, val } = getSel();
    const text = sel || ph;
    const newVal = val.slice(0, s) + before + text + after + val.slice(e);
    setVal(newVal, s + before.length, s + before.length + text.length);
  }
  function prefixLines(prefix, ph) {
    const { s, e, sel, val } = getSel();
    if (!sel) {
      const ls = val.lastIndexOf('\n', s - 1) + 1;
      const newVal = val.slice(0, ls) + prefix + ph + val.slice(ls);
      return setVal(newVal, ls + prefix.length, ls + prefix.length + ph.length);
    }
    const bs = val.lastIndexOf('\n', s - 1) + 1;
    let be = val.indexOf('\n', e); if (be === -1) be = val.length;
    const block = val.slice(bs, be);
    const nb = block.split('\n').map(l => prefix + l).join('\n');
    const newVal = val.slice(0, bs) + nb + val.slice(be);
    setVal(newVal, bs, bs + nb.length);
  }
  function applyCmd(cmd) {
    if (!current) { toast('请先打开或新建一篇文章', 'err'); return; }
    switch (cmd) {
      case 'bold': return wrap('**', '**', '加粗文字');
      case 'italic': return wrap('*', '*', '斜体文字');
      case 'code': return wrap('`', '`', '代码');
      case 'h2': return prefixLines('# ', '标题');
      case 'quote': return prefixLines('> ', '引用内容');
      case 'ul': return prefixLines('- ', '列表项');
      case 'ol': return prefixLines('1. ', '列表项');
      case 'codeblock': return wrap('```\n', '\n```', '代码块');
      case 'link': {
        const url = prompt('请输入链接地址（URL）：', 'https://');
        if (!url) return;
        const text = (getSel().sel) || (prompt('链接显示文字：', '链接文字') || '链接文字');
        return wrap('[', '](' + url + ')', text);
      }
      case 'image': {
        const url = prompt('请输入图片地址（外链 URL 或 /img/xxx.jpg）：', 'https://');
        if (!url) return;
        const alt = (prompt('图片描述（alt，可留空）：', '') || '');
        return insertBlock('![' + alt + '](' + url + ')\n');
      }
      case 'upload': return uploadImage();
    }
  }
  // 在光标处插入（必要时补换行，使图片/块级元素独占一行）
  function insertBlock(ins) {
    const { s, val } = getSel();
    const needNl = (val.slice(0, s) && !val.slice(0, s).endsWith('\n')) ? '\n' : '';
    const newVal = val.slice(0, s) + needNl + ins + val.slice(bodyEl.selectionEnd);
    setVal(newVal, s + needNl.length + ins.length, s + needNl.length + ins.length);
  }
  function bindToolbar() {
    document.querySelectorAll('#toolbar .tb').forEach(b => {
      b.addEventListener('mousedown', (e) => e.preventDefault()); // 点按钮时不丢失选区
      b.addEventListener('click', () => applyCmd(b.dataset.cmd));
    });
  }

  // ---------- 本地图片上传入仓并插入 ----------
  function fileToB64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const d = r.result; resolve(d.slice(d.indexOf(',') + 1)); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  function uploadImage() {
    if (!current) { toast('请先打开或新建一篇文章', 'err'); return; }
    imgInput.click();
  }
  async function onImagePicked() {
    const file = imgInput.files && imgInput.files[0];
    imgInput.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('请选择图片文件', 'err'); return; }
    toast('图片上传中…', 'ok');
    try {
      const b64 = await fileToB64(file);
      const safe = (Date.now() + '-' + file.name.replace(/[^\w.\-]/g, '_')).toLowerCase();
      const path = 'static/img/uploads/' + safe;
      let sha;
      try { const ex = await gh('contents/' + path); sha = ex.sha; } catch (_) {}
      await gh('contents/' + path, { method: 'PUT', body: { message: 'upload ' + path, content: b64, sha } });
      const url = '/img/uploads/' + safe;   // 站点同源路径，部署后即时可用（国内访问快）
      insertBlock('![](' + url + ')\n');
      toast('图片已上传并插入（部署后预览可见）', 'ok');
    } catch (err) {
      toast(err.message || '上传失败', 'err');
    }
  }

  // ---------- 事件绑定 ----------
  function bind() {
    bindToolbar();
    bindCombos();
    imgInput.addEventListener('change', onImagePicked);
    $('btn-login').addEventListener('click', login);
    $('btn-logout').addEventListener('click', logout);
    $('btn-new').addEventListener('click', newPost);
    $('btn-savedraft').addEventListener('click', () => savePost(false));
    $('btn-publish').addEventListener('click', () => savePost(true));
    $('btn-del').addEventListener('click', deletePost);
    searchInput.addEventListener('input', () => renderList(searchInput.value));
    bodyEl.addEventListener('input', () => { updateGutter(); schedulePreview(); markDirty(); });
    bodyEl.addEventListener('scroll', () => { gutter.scrollTop = bodyEl.scrollTop; });

    // 标题输入时自动同步 slug（新文章、未被手动改过时）
    fTitle.addEventListener('input', () => {
      if (current && current.isNew && !slugDirty) {
        fSlug.value = 'archives/' + autoSlug(fTitle.value);
      }
    });
    // 用户手动改 slug → 停止自动跟随
    fSlug.addEventListener('input', () => { slugDirty = true; });
    bodyEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); applyCmd('bold'); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); applyCmd('italic'); return; }
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
