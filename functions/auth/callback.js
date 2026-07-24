// Decap CMS GitHub 鉴权回调（自托管）
// 部署位置：Cloudflare Pages Functions -> /auth/callback
// GitHub 在用户授权后带着 ?code=...&state=... 回到这里，
// 我们用 client_secret 换取 access_token，再重定向回 inurl.top/#access_token=...
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const clientId = env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq';
  const clientSecret = env.GITHUB_CLIENT_SECRET || '';
  const redirectUri = 'https://inurl.top/auth/callback';

  if (!code) {
    return new Response('missing code', { status: 400 });
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
    return new Response('no token: ' + JSON.stringify(tokenJson), { status: 400 });
  }
  const finalUrl =
    'https://inurl.top/#access_token=' + encodeURIComponent(token) +
    '&state=' + encodeURIComponent(state) +
    '&provider=github';
  return Response.redirect(finalUrl, 302);
}
