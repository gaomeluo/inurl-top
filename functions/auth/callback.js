// Decap CMS GitHub 鉴权回调（自托管）
// 路由：Cloudflare Pages Functions -> GET /auth/callback
// GitHub 在用户授权后带着 ?code=...&state=... 回到这里，
// 用 client_secret 换取 access_token，再重定向回 /admin/ 让 Decap 完成登录。
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const clientId = env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq';
  const clientSecret = env.GITHUB_CLIENT_SECRET || '';
  const redirectUri = 'https://inurl.top/auth/callback';

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
    return new Response('GitHub 未返回 access_token：' + JSON.stringify(tokenJson), { status: 400 });
  }

  // 重定向回 Decap 后台，把 token 放进 hash 的 query 串里，
  // Decap 的 GitHubAuthenticator 会从 location.hash 读取 access_token 完成登录。
  const finalUrl =
    'https://inurl.top/admin/#/auth?access_token=' + encodeURIComponent(token) +
    '&state=' + encodeURIComponent(state) +
    '&provider=github';
  return Response.redirect(finalUrl, 302);
}
