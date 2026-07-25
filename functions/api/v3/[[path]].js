// 自研文章后台的 GitHub API 反代（原 Decap 基建复用）。
// 背景：编辑器（static/editor.js）把请求发到同源 /api/v3/*，
//   由本函数原样反代到 https://api.github.com/*，透传 method/headers/body 与 Authorization。
// 路由：functions/api/v3/[[path]].js  →  匹配 /api/v3/*（Cloudflare Pages catch-all 语法）
//
// ⚠️ 安全约束（防被当成开放代理滥用）：
//   只允许两类路径——
//     ① /repos/gaomeluo/inurl-top/...   （本站仓库的增删改查）
//     ② /user 与 /user/...              （拿登录用户名）
//   其余一律 403。这样即便有人知道这个入口，也只能动你自己的仓库，
//   不能拿 inurl.top 的 IP 去刷 GitHub 其它接口。
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 去掉 /api/v3 前缀，拼回 github 真实路径
  const ghPath = url.pathname.replace(/^\/api\/v3/, '') + url.search;

  // ⚠️ 路径白名单：仅放行本站仓库与 /user
  if (!/^\/(repos\/gaomeluo\/inurl-top|user)(\/.*)?$/.test(ghPath)) {
    return new Response('Forbidden: 该路径不在允许的反代范围内。', { status: 403 });
  }

  const target = 'https://api.github.com' + ghPath;

  // 透传请求头（含编辑器发的 Authorization: token gho_...）
  const headers = new Headers(request.headers);
  // 去掉 Cloudflare 注入的逐跳/主机头与 cookie，避免 GitHub 拒绝或携带无关凭据
  for (const h of ['host', 'cf-ray', 'cf-connecting-ip', 'cf-visitor',
    'cf-request-id', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 'cookie']) {
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
  // 同源（inurl.top → inurl.top/api/v3）无需 CORS；不再设 * 通配，避免被任意站调用
  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders,
  });
}
