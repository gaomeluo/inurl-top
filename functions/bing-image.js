// Cloudflare Pages Function: 把侧边栏的 header 背景换成微软 Bing 每日一图。
// 访问 /bing-image 时，服务端拉取 Bing 当日图片，302 跳转到图片地址
// （浏览器跟随重定向直接从 Bing CDN 加载，不占用本站带宽）。
// 缓存 6 小时，所以每天至少会自动刷新一次，对齐「每日一图」。

const API =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

// API 不可用时兜底（取自一次真实返回，尺寸已缩到 1366x768）
const FALLBACK =
  'https://www.bing.com/th?id=OHR.GaliciaBeach_ZH-CN1246611659_1366x768.jpg&rf=LaDigue_1366x768.jpg&pid=hp';

export async function onRequest() {
  try {
    const res = await fetch(API, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await res.json();
    // 把原图 1920x1080 缩到 1366x768，侧边栏更省流量
    const url =
      'https://www.bing.com' + data.images[0].url.replace(/1920x1080/g, '1366x768');
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=21600, s-maxage=21600',
      },
    });
  } catch (e) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: FALLBACK,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
