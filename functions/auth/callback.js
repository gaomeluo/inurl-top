// Decap CMS GitHub 鉴权回调（自托管）
// 路由：Cloudflare Pages Functions -> GET /auth/callback
//
// GitHub 在用户授权后带着 ?code=...&state=... 回到这里，
// 用 client_secret 换取 access_token，再把 token 通过 postMessage 发回父窗口
// （Decap 的 NetlifyAuthenticator.authorizeCallback 正在等这条消息，
//   格式必须是 'authorization:github:success:' + JSON.stringify({ token })）。
// 父窗口收到后才会真正完成登录 —— 之前用 302 重定向带 hash 是错的，3.3.3 不读 hash。
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const clientId = (env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq').trim();
  const clientSecret = (env.GITHUB_CLIENT_SECRET || '').trim();
  const redirectUri = origin + '/auth/callback';

  if (!code) {
    return new Response('GitHub 回调缺少 code 参数。', { status: 400 });
  }
  if (!clientSecret) {
    return new Response(
      'GITHUB_CLIENT_SECRET 未设置。请在 Cloudflare Pages 项目设置中添加该环境变量（Production 环境）。',
      { status: 500 }
    );
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = await tokenRes.json();
  const token = tokenJson.access_token;

  if (!token) {
    const errPayload = JSON.stringify(tokenJson);
    const errHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
  try { if(window.opener){ window.opener.postMessage('authorization:github:error:' + ${JSON.stringify(errPayload)}, ${JSON.stringify(origin)}); } } catch(e){}
  setTimeout(function(){ window.close(); }, 300);
</script>
</body></html>`;
    return new Response(errHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const payload = JSON.stringify({ token: token });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>登录成功</title></head>
<body>
<script>
(function(){
  var ORIGIN = ${JSON.stringify(origin)};
  var MSG = 'authorization:github:success:' + ${JSON.stringify(payload)};
  try { if(window.opener){ window.opener.postMessage(MSG, ORIGIN); } } catch(e){}
  setTimeout(function(){ window.close(); }, 400);
})();
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
