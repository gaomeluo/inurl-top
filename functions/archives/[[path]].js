// Cloudflare Pages Function
// 修复「文章链接含大写字母 → 打不开/跳首页」的 bug：
//   Hugo 默认把永久链接路径转小写（permalinks = /archives/:slug/），
//   所以生成页实际是 /archives/disney/ 这样的小写地址；
//   但文章正文里手写的站内链接常带大写（如 /archives/Disney/），
//   Hugo 不会改写 markdown 正文里的 URL，导致大写链接对不上小写页 → 404/跳首页。
// 这里把任意含大写字母的 /archives/* 请求 301 重定向到小写版本，一劳永逸。
export function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 仅当路径含大写字母时才重定向，避免无谓跳转
  if (/[A-Z]/.test(path)) {
    url.pathname = path.toLowerCase();
    return Response.redirect(url.toString(), 301);
  }

  // 已是小写路径：放行，由 Cloudflare 返回对应静态文件（含 /archives/ 列表页）
  return context.next();
}
