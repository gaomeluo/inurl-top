(function () {
  var mask = document.getElementById('searchMask');
  var modal = document.getElementById('searchModal');
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var cache = null;

  function load() {
    if (cache) return Promise.resolve(cache);
    return fetch('/index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { cache = d.posts || []; return cache; });
  }

  window.openSearch = function () {
    if (!modal) return;
    mask.classList.add('open');
    modal.classList.add('open');
    load();
    if (input) { input.value = ''; input.focus(); render(''); }
  };

  window.closeSearch = function () {
    mask.classList.remove('open');
    modal.classList.remove('open');
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeSearch();
  });

  if (input) input.addEventListener('input', function () {
    render(input.value.trim().toLowerCase());
  });

  function render(q) {
    if (cache === null) return;
    var list = cache.filter(function (p) {
      if (!q) return true;
      var cats = Array.isArray(p.categories) ? p.categories.join(' ') : (p.categories || '');
      var hay = ((p.title || '') + (p.summary || '') + (p.content || '') + cats).toLowerCase();
      return hay.indexOf(q) > -1;
    }).slice(0, 30);

    if (!list.length) {
      results.innerHTML = '<div class="r-empty">没有找到相关文章</div>';
      return;
    }
    var html = '';
    list.forEach(function (p) {
      var cat = (Array.isArray(p.categories) && p.categories.length)
        ? '<span class="r-cat">' + p.categories.join('/') + '</span>' : '';
      var ex = (p.summary || '').replace(/<[^>]+>/g, '');
      if (ex.length > 70) ex = ex.slice(0, 70) + '…';
      html += '<a href="' + p.url + '">' + cat +
        '<span class="r-title">' + p.title + '</span>' +
        '<div class="r-excerpt">' + ex + '</div></a>';
    });
    results.innerHTML = html;
  }
})();
