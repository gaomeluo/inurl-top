// 自研文章后台 GitHub 鉴权（自托管，使登录全程走 inurl.top 域名）
// 路由：Cloudflare Pages Functions -> GET /auth
//
// 登录流程是「弹窗 + postMessage 握手」：
//   1) 向父窗口 postMessage('authorizing:github')
//   2) 收到父窗口回显（同样 'authorizing:github'）后，再把弹窗跳到 GitHub 授权页
// 否则父窗口（static/editor.js 的 onAuthMessage）收不到握手，登录会卡住。
//
// 需要 Cloudflare Pages 环境变量（项目设置 -> Environment variables，Production）：
//   GITHUB_CLIENT_ID     = Ov23liJ4fvPrfXbIBSdq
//   GITHUB_CLIENT_SECRET = 你的 GitHub OAuth App 密钥
// GitHub OAuth App 的 Authorization callback URL 必须设为： https://inurl.top/auth/callback
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin; // 即 Decap config 的 base_url，如 https://inurl.top
  const clientId = (env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq').trim();
  const redirectUri = origin + '/auth/callback';
  const scope = url.searchParams.get('scope') || 'repo';
  const state = url.searchParams.get('state') || '';
  const gh =
    'https://github.com/login/oauth/authorize?client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scope) +
    (state ? '&state=' + encodeURIComponent(state) : '');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>授权中…</title></head>
<body>
<script>
(function(){
  var ORIGIN = ${JSON.stringify(origin)};
  var GH = ${JSON.stringify(gh)};
  var done = false;
  function go(){ if(done) return; done = true; window.location = GH; }
  // 等待父窗口（Decap）回显 handshake
  window.addEventListener('message', function(e){
    if(e.origin === ORIGIN && e.data === 'authorizing:github'){ go(); }
  });
  // 向父窗口发起握手
  if(window.opener){ window.opener.postMessage('authorizing:github', ORIGIN); }
  // 兜底：父窗口未就绪（极少数情况）也直接跳转，避免卡死
  setTimeout(go, 2000);
})();
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
// (redeploy-marker: 触发 Cloudflare 重新部署以加载最新 GITHUB_CLIENT_SECRET)
