// Decap CMS GitHub 鉴权（自托管，使登录全程走 inurl.top 域名）
// 路由：Cloudflare Pages Functions -> GET /auth
// 需要 Cloudflare Pages 环境变量（项目设置 -> Environment variables，Production）：
//   GITHUB_CLIENT_ID     = Ov23liJ4fvPrfXbIBSdq
//   GITHUB_CLIENT_SECRET = 你的 GitHub OAuth App 密钥
// GitHub OAuth App 的 Authorization callback URL 必须设为： https://inurl.top/auth/callback
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const clientId = (env.GITHUB_CLIENT_ID || 'Ov23liJ4fvPrfXbIBSdq').trim();
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
// (redeploy-marker: 触发 Cloudflare 重新部署以加载最新 GITHUB_CLIENT_SECRET)
