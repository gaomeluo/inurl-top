(function () {
  // 汉堡菜单（移动端）
  window.toggleNav = function () {
    var hb = document.getElementById('hamburger-1');
    var menu = document.getElementById('nav-menu');
    if (!hb || !menu) return;
    hb.classList.toggle('is-active');
    menu.style.display = (menu.style.display === 'block') ? '' : 'block';
  };

  // 回顶部 + 阅读进度条
  var top = document.getElementById('returnTop');
  var bar = document.getElementById('read-progress');
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (top) top.style.display = y > 200 ? 'block' : 'none';
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h * 100) : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 滚动渐入
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }
})();

// 标签云：随机配色（对齐原站 rgb(rand,rand,rand)）；悬停高亮由 CSS 的 :hover 接管
(function () {
  document.querySelectorAll('.tag-cloud a').forEach(function (a) {
    var r = 110 + Math.floor(Math.random() * 120);
    var g = 110 + Math.floor(Math.random() * 120);
    var b = 110 + Math.floor(Math.random() * 120);
    a.style.setProperty('--tc', 'rgb(' + r + ',' + g + ',' + b + ')');
  });
})();
