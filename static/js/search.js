/* 顶级索引 — 客户端搜索（基于 Hugo 生成的 /index.json） */
(function () {
  var btn = document.getElementById('searchToggle');
  var modal = document.getElementById('searchModal');
  if (!btn || !modal) return;

  var input = modal.querySelector('input');
  var results = modal.querySelector('.search-results');
  var cache = null;

  function open() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    input.focus();
  }
  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', open);
  modal.querySelector('.search-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function load() {
    if (cache) return Promise.resolve(cache);
    return fetch('/index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { cache = d.posts || []; return cache; });
  }

  function render(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    load().then(function (posts) {
      var hits = posts.filter(function (p) {
        var hay = [
          p.title || '', p.summary || '', p.content || '',
          (p.tags || []).join(' '), (p.categories || []).join(' ')
        ].join(' ').toLowerCase();
        return hay.indexOf(q) > -1;
      }).slice(0, 20);

      if (!hits.length) {
        results.innerHTML = '<p class="search-empty">没有找到相关文章</p>';
        return;
      }
      results.innerHTML = hits.map(function (p) {
        var meta = ((p.categories && p.categories.length) ? '#' + p.categories.join(' #') : '') + ' · ' + (p.date || '');
        var sum = (p.summary || '').slice(0, 80);
        return '<a class="search-item" href="' + p.url + '">' +
          '<span class="si-title">' + p.title + '</span>' +
          '<span class="si-meta">' + meta + '</span>' +
          '<span class="si-sum">' + sum + '</span></a>';
      }).join('');
    });
  }

  input.addEventListener('input', function () { render(input.value); });
})();
