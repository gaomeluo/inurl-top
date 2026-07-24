// Decap CMS 自托管关键补丁：GitHub API 反代
// 背景：Decap 3.3.3 的 github 后端把 backend.base_url 同时当成
//   ① 鉴权前缀（${base_url}/auth）
//   ② GitHub API 基地址（${base_url}/api/v3）
// 我们为了让鉴权走 https://inurl.top/auth，必须把 base_url 设成 https://inurl.top，
// 但这会让所有 GitHub API 调用变成 https://inurl.top/api/v3/...（静态站不提供 → 404 → 登录循环）。
// 本函数把 /api/v3/* 原样反代到 https://api.github.com/*，透传 method/headers/body 与 Authorization。
// 路由：functions/api/v3/[[path]].js  →  匹配 /api/v3/*（Cloudflare Pages catch-all 语法）
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 去掉 /api/v3 前缀，拼回 github 真实路径
  const ghPath = url.pathname.replace(/^\/api\/v3/, '') + url.search;
  const target = 'https://api.github.com' + ghPath;

  // 透传请求头（含 Decap 发的 Authorization: token gho_...）
  const headers = new Headers(request.headers);
  // 去掉 Cloudflare 注入的逐跳/主机头，避免 GitHub 拒绝
  for (const h of ['host', 'cf-ray', 'cf-connecting-ip', 'cf-visitor',
    'cf-request-id', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip']) {
    headers.delete(h);
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const resp = await fetch(target, init);
  const respHeaders = new Headers(resp.headers);
  // 同源（inurl.top → inurl.top/api/v3）无需 CORS，但加上更稳妥
  respHeaders.set('Access-Control-Allow-Origin', '*');
  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders,
  });
}
