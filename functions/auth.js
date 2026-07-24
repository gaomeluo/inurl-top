// Decap CMS GitHub 鉴权（自托管，使登录全程走 inurl.top 域名）
// 部署位置：Cloudflare Pages Functions -> /auth
// 需要的环境变量（在 Cloudflare Pages 控制台 -> 项目 inurl-top -> Settings -> Environment variables 添加）：
//   GITHUB_CLIENT_ID     = Ov23liJ4fvPrfXbIBSdq
//   GITHUB_CLIENT_SECRET = 你的 GitHub OAuth App 密钥
// GitHub OAuth App 的 Authorization callback URL 必须设为： https://inurl.top/auth/callback
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const clientId = env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq';
  const redirectUri = 'https://inurl.top/auth/callback';
  const scope = url.searchParams.get('scope') || 'repo';
  const state = url.searchParams.get('state') || '';
  const gh =
    'https://github.com/login/oauth/authorize?client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scope) +
    '&state=' + encodeURIComponent(state);
  return Response.redirect(gh, 302);
}
