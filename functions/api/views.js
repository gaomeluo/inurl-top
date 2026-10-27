// 首方文章阅读量计数器（Cloudflare Pages Functions + KV）
// 路由：functions/api/views.js  →  命中 /api/views
//
// 用法：
//   GET  /api/views?path=/archives/disney/   → 读取当前阅读量（不+1）
//   POST /api/views?path=/archives/disney/   → 阅读量+1 并返回最新值
//
// 依赖：Cloudflare Pages 后台需绑定一个 KV 命名空间，变量名必须为 VIEWS_KV。
//       未绑定时接口返回 500 并提示，前端会自动回退显示历史 views，不会崩。
//
// 计数键：以「规范化后的页面路径」为 key（如 /archives/disney/）。
// 首访种子：若该路径在 KV 中尚无值，则使用下方 SEED（迁移自老 Typecho 的历史 views）
//           作为初始基数，保证迁移后数字不归零。

// >>> VIEWS_SEED_START
const SEED = {
  'baypremium': 6798,
  'binance': 7192,
  'buydisney': 5748,
  'buynetflix': 8600,
  'clashforopenwrt': 77219,
  'datizi': 31991,
  'disney': 11217,
  'embyhaibao': 18747,
  'lanfanvpn': 8681,
  'looknetflix': 10012,
  'microsoft365': 1292,
  'mojie': 58262,
  'nasxunlei': 30016,
  'netflixjiaocheng': 6355,
  'okx': 9247,
  'pjxublei': 4544,
  'premium': 7378,
  'rentuibanganzhuang': 4576,
  'shipinvip': 17017,
  'sjmusic': 4556,
  'sjmusicxz': 5588,
  'spotifyjiatinghuiyuan': 3852,
  'wodeshijieandroid': 1296,
  'wodeshijiewindows': 17,
  'xiazaiapp': 9515,
  'xiazaixuexiziliao': 27269,
  'yunchatgpt': 4116,
  'zhongguuojichangvpn': 60749,
  'zhucechatgpt': 4845,
  'zhucegoogle': 5018,
  'zhucespotify': 11643,
};
// <<< VIEWS_SEED_END

function normalizePath(p) {
  p = (p || '/').trim().toLowerCase();
  if (!p.startsWith('/')) p = '/' + p;
  if (!p.endsWith('/')) p = p + '/';
  return p;
}

// 从路径抽取 slug（/archives/disney/ → disney），用于在 SEED 中查历史基数
function slugOf(path) {
  return path.replace(/^\/archives\//, '').replace(/\/+$/, '');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = normalizePath(url.searchParams.get('path') || '/');
  const method = request.method.toUpperCase();
  const kv = env.VIEWS_KV;

  if (!kv) {
    return json({ error: 'KV 未绑定：请在 Cloudflare Pages 后台为本项目添加 KV 命名空间绑定，变量名 VIEWS_KV' }, 500);
  }

  let count = parseInt(await kv.get(key) || '', 10);
  if (isNaN(count)) {
    // 首次访问：用迁移的历史 views 作为基数（不立即写回，等第一次真实访问+1后再持久化）
    count = SEED[slugOf(key)] || 0;
  }

  if (method === 'POST') {
    count += 1;
    await kv.put(key, String(count));
  }

  return json({ path: key, views: count });
}
