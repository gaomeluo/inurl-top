# inurl.top

个人博客站点。

- **静态生成**：[Hugo](https://gohugo.io/)（`hugo.exe --minify` 构建）
- **部署**：Cloudflare Pages（仓库 `gaomeluo/inurl-top`，分支 `main`，push 即自动构建部署）
- **后台 CMS**：[Decap CMS](https://decapcms.org/) 3.3.3，访问 `https://inurl.top/admin/`
- **评论**：Giscus（按文章 pathname 绑定 GitHub Discussions）

---

## 目录结构（与本仓库相关部分）

```
.
├── static/admin/            # Decap CMS 前端
│   ├── index.html           # 加载 decap-cms 3.3.3
│   └── config.yml          # ★ 后台配置（见下）
├── functions/              # ★ Cloudflare Pages Functions（自托管 OAuth + URL 重写）
│   ├── auth.js                       # GET /auth         —— 弹窗握手页
│   ├── auth/callback.js             # GET /auth/callback —— 换 token 并回传
│   ├── api/v3/[[path]].js          # /api/v3/*      —— GitHub API 反代
│   ├── archives/[[path]].js        # /archives/*    —— 大写字母 URL 301 转小写（见「坑 7」）
│   └── bing-image.js               # /bing-image   —— 侧边栏 Bing 每日一图（见「坑 9」）
├── scripts/
│   ├── migrate_comments_to_giscus.py   # 旧 Typecho 评论 → Giscus Discussions
│   └── typecho_to_hugo.py             # SQL 解析工具（被上面引用）
├── content/posts/          # 文章（Decap 可直接编辑）
└── hugo.toml
```

---

## Decap CMS 后台登录（Cloudflare Pages 自托管 OAuth）

> ⚠️ **前置结论**：Decap 的 GitHub 登录**不能**用 Netlify 内置代理（`api.netlify.com/auth`）——
> 那个代理只对**部署在 Netlify 上的站点**有效，对 Cloudflare Pages 站点天生返回 404。
> 在 Cloudflare 上必须**自托管 OAuth 函数**（下面的 `functions/`）。

### 最终正确配置（`static/admin/config.yml` 的 backend 段）

```yaml
backend:
  name: github
  repo: gaomeluo/inurl-top
  branch: main
  app_id: Ov23liJ4fvPrfXbIBSdq        # GitHub OAuth App 的 Client ID
  base_url: https://inurl.top           # 必须是你自己的域名
  auth_endpoint: /auth                  # 指向 functions/auth.js
```

- `base_url` 必须设成自己的域名（原因见「坑 4」）。
- `auth_endpoint: /auth`（**相对路径**，不要写完整 URL —— 见「坑 2」）。

### Cloudflare Pages 环境变量（Production）

项目 `inurl-top` → Settings → Environment variables → 选 **Production** 添加：

```
GITHUB_CLIENT_ID     = Ov23liJ4fvPrfXbIBSdq
GITHUB_CLIENT_SECRET = 你的 GitHub OAuth App 密钥
```

> 若函数代码里已硬编码兜底 `client_id`（见 `functions/auth.js`），`GITHUB_CLIENT_ID` 可省略；
> 但 `GITHUB_CLIENT_SECRET` **必须有**，否则无法用 code 换 token。

### GitHub OAuth App 设置

GitHub → 头像 → Settings → **Developer settings** → **OAuth Apps** → 对应 App：

- **Client ID** = `Ov23liJ4fvPrfXbIBSdq`
- **Authorization callback URL** = `https://inurl.top/auth/callback`   ← 必须是这个
- （Client secret 在 Cloudflare 环境变量里用，不要写进仓库）

### 三个 Functions 文件（已就位，勿动逻辑）

| 文件 | 路由 | 作用 |
|------|------|------|
| `functions/auth.js` | `GET /auth` | 弹窗内先 `postMessage('authorizing:github')` 与父窗握手，收到回显后再跳 GitHub 授权页 |
| `functions/auth/callback.js` | `GET /auth/callback` | GitHub 带着 `code` 回来 → 用 `client_secret` 换 `access_token` → `opener.postMessage('authorization:github:success:...')` 把 token 发回父窗 |
| `functions/api/v3/[[path]].js` | `/api/v3/*` | 把 GitHub API 请求反代到 `https://api.github.com/*`（**必配**，见「坑 4」） |

### 登录流程（Decap 3.3.3 = 弹窗 + postMessage 握手，不是 hash 重定向）

1. 打开 `https://inurl.top/admin/` → 点 **Login with GitHub**
2. 浏览器**弹窗**打开 `https://inurl.top/auth?provider=github&...`
3. `auth.js` 在弹窗内与父窗口完成 `authorizing:github` 握手 → 弹窗跳到 GitHub 授权页
4. 你同意授权 → GitHub 回跳 `https://inurl.top/auth/callback?code=...&state=...`
5. `callback.js` 换到 `access_token` → 通过 `postMessage` 把 token 发回父窗 → 关闭弹窗
6. 父窗口收到 token → Decap 加载成功，进入后台

---

## 踩坑全集（血泪史，下次直接对照）

### 坑 1：用了 Netlify 内置 OAuth 代理 → 404 死路
- **现象**：弹窗地址变成 `https://api.netlify.com/auth?...` 或直接 404。
- **原因**：`api.netlify.com/auth` 只对部署在 Netlify 的站点有效；Cloudflare Pages 站点走它就是 404。
- **解决**：放弃 Netlify 代理，改自托管 `functions/`（见上）。

### 坑 2：`auth_endpoint` 写了完整 URL → 被拼成双倍地址
- **现象**：弹窗地址变成 `https://api.netlify.com/https://api.netlify.com/auth?...` → Not Found。
- **原因**：Decap 把 `auth_endpoint` 当成**相对路径**拼到默认 base 后面。写了完整 URL 反而变成 `base + 完整URL`。
- **解决**：`auth_endpoint: /auth`（相对路径即可）。

### 坑 3：`incorrect_client_credentials`
- **现象**：授权后回调报 `incorrect_client_credentials`，或一直停在授权界面。
- **原因**（两种）：
  1. `GITHUB_CLIENT_SECRET` 的值**不是** `Ov23liJ4fvPrfXbIBSdq` 这个 App 的密钥（GitHub 里可能建了多个 OAuth App，填串了）；
  2. 在 GitHub 点过 **Regenerate client secret** → 旧密钥立即作废 → 但 **Cloudflare 没重新部署**，线上函数还在用旧（已死）密钥。
- **解决**：
  - 按 **Client ID 列精确匹配**找到 `Ov23liJ4fvPrfXbIBSdq` 那个 App，复制它自己的 Client Secret；
  - 改完 Cloudflare 环境变量后**必须重新部署**（找不到 Retry 按钮就推个小提交触发构建）；
  - 函数代码已对 `GITHUB_CLIENT_SECRET` 做 `.trim()`，避免粘贴时尾随空格。

### 坑 4：`base_url` 把 GitHub API 基地址劫持 → 登录无限循环
- **现象**：能走到拿 token（`#/auth?access_token=gho_...`），但一直循环回登录页；**F12 无红色报错、Network 无失败请求**（静默失败）。
- **原因**：Decap 3.3.3 的 github 后端把 `base_url` 同时用于两处——
  - 鉴权前缀：`${base_url}/auth` → `inurl.top/auth` ✅
  - **GitHub API 基地址**：`${base_url}/api/v3` → `inurl.top/api/v3` ❌（静态站不提供 → 全 404）
  - Decap 拿到 token 后去调 `inurl.top/api/v3/user` 失败 → 退回登录 → 死循环。
- **解决**：加 `functions/api/v3/[[path]].js` 把 `/api/v3/*` **原样反代**到 `https://api.github.com/*`。
  - 验证：`https://inurl.top/api/v3/user`（带 token）应返回 GitHub JSON（HTTP 200）。

### 坑 5：`callback.js` 用 302 hash 重定向 → Decap 3.3.3 不读 hash → 无限循环
- **现象**：弹窗地址停在 `https://inurl.top/admin/#/auth?access_token=gho_...&state=&provider=github`，自动循环。
- **原因**：这是**最隐蔽**的一个。Decap 2.x 是「URL hash 重定向」流程，但 **3.3.3 走的是 `NetlifyAuthenticator`——弹窗 + `postMessage` 握手**，根本不读 URL 里的 token。
  - 父窗口在等 `window.opener.postMessage('authorization:github:success:...')`；
  - 旧代码用 302 把弹窗重定向到带 hash 的 `/admin/`，父窗永远等不到消息 → 卡死。
- **解决**：`callback.js` 改用 `window.opener.postMessage('authorization:github:success:' + JSON.stringify({token}), origin)` 把 token 发回父窗，再 `window.close()`。
  - 同理 `auth.js` 必须在弹窗内先与父窗完成 `authorizing:github` 握手再跳 GitHub。

### 坑 6：GitHub PAT 明文进仓库 → Push Protection 拦截
- **现象**：`git push` 被拒 `push declined due to repository rule violations`。
- **原因**：把 GitHub Personal Access Token 明文硬编码进脚本，被 GitHub Push Protection（密钥扫描）识别拦截。
- **解决**：密钥一律走环境变量（如 `GITHUB_TOKEN`），**绝不进仓库**；若已提交，在推送前 `git commit --amend` 重写（未推上远程时安全）。
  - ⚠️ GitHub 对泄露的 PAT 通常会**自动吊销**，泄露后需重发新 token。

### 坑 7：文章链接含大写字母 → 跳首页 / 打不开
- **现象**：文章正文里手写的站内超链接、`上一篇 / 下一篇` 里，只要 URL 含大写字母（如 `/archives/Disney/`、`/archives/ClashforOpenWRT/`）就跳回**首页**或 404；把大写改成小写（`/archives/disney/`）却能正常打开。
- **原因**：Hugo 默认把永久链接路径**转成小写**（`permalinks = { posts = "/archives/:slug/" }` 生成的是 `/archives/disney/` 这种小写地址）。
  - 文章**正文里手写的 URL 不会被 Hugo 改写**，所以大写链接对不上小写页；
  - Cloudflare 找不到对应路径 → 被站点的「未匹配路由兜底」规则甩回首页（看起来像"跳首页"）。
  - ⚠️ **注意**：`_default/single.html` 里 `上一篇/下一篇` 用的是 `{{ .Prev.RelPermalink }}` / `{{ .Next.RelPermalink }}`，Hugo 生成的 `RelPermalink` **已经是小写**，模板本身没 bug；问题只出在**正文手写的绝对/相对大写链接**。
- **解决**：加 `functions/archives/[[path]].js`，把任意含大写字母的 `/archives/*` 请求 **301 重定向**到小写版本（已是小写的请求直接放行，不动静态文件和首页）。核心逻辑：

  ```js
  export function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    if (/[A-Z]/.test(path)) {            // 仅当路径含大写字母才重定向
      url.pathname = path.toLowerCase();
      return Response.redirect(url.toString(), 301);
    }
    return context.next();               // 已是小写 → 正常返回静态文件
  }
  ```
  - 验证：`curl -I https://inurl.top/archives/Disney/` → 301 且 `Location: /archives/disney/`；小写页、`/`、`/auth` 均不被误伤（200 / 正常）。
  - 治本建议：写文时尽量用 Hugo 的 `relref` / `ref` 短码生成站内链接，让 Hugo 统一管理大小写，避免手写大写路径。

### 坑 8：`overflow-x: hidden` 加在 `body` 上 → 右侧多一条竖拉条 + 回顶部失效
- **现象**：为了消掉首页底部横拉条，曾写 `html, body { overflow-x: hidden }`。结果：① 网站右侧多出一条竖拉条；② 页面右下角的「回顶部」按钮（`main.js` 里靠 `window.pageYOffset` 判断显隐、`window.scrollTo` 回顶）彻底失灵。
- **原因**：`body` 一旦设了 `overflow-x: hidden` 会变成**独立的滚动容器**——
  - 它自身尺寸按内容撑开，于是右侧出现一条属于 body 的竖拉条；
  - 同时切断了 `window` 滚动，依赖 `window.scrollY` 的返回顶部逻辑收不到事件 → 按钮不显示、点击也无效。
  - （原站的「拉到底部出现上箭头、点一下回顶部」功能其实一直都在：`footer.html` 的 `.return-top` + `.tri`，滚动超 200px 浮现；只是被 `body` 的规则连累了。）
- **解决**：只保留 `html { overflow-x: hidden; }`，**把 body 上的规则删掉**。这样横拉条照样被裁掉，`window` 滚动恢复，回顶部按钮也回来了。
  - 经验：横向溢出裁剪一律只放 `html`（或 `overflow-x: clip`）；`body` 上动 `overflow` 多半会造出第二条滚动条。

### 坑 9：侧边栏接入微软 Bing 每日一图（Cloudflare Pages Function）
- **需求**：原站右侧栏「主页 / GitHub / QQ」上方的 `info-header` 背景是微软 Bing 每日一图，每天自动变。克隆站也想实现。
- **实现**：新增 `functions/bing-image.js`（路由 `/bing-image`）——
  - 服务端 `fetch` 拉取 `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`，取出当日大图；
  - 把原图 `1920x1080` 的地址字符串 `replace` 成 `1366x768`，**302 跳转到 Bing CDN 真图**——浏览器跟随重定向直接从 Bing 加载，**不占用本站带宽**；
  - 带 `Cache-Control: public, max-age=21600`（6 小时），所以每天至少自动刷新一次，对齐「每日一图」；
  - `try/catch` 兜底：Bing 接口不可用时，跳到一张写死的 `FALLBACK` 兜底图。
  - ⚠️ 沙箱/线上若访问 `bing.com` 超时，函数会走兜底图，属正常降级，不是 bug。
- **接入**：`layouts/partials/sidebar.html` 里 `info-header` 的背景从 `/img/about.jpg` 改成 `url(/bing-image)`（`.info-header` 自带 `background-size: cover`，图会铺满）。
- **验证**：浏览器开 `https://inurl.top/bing-image` 会被 302 跳到 `bing.com/th?id=...` 的图片；右侧栏顶部即当天美图，每天自动换。

### 坑 10：hero 标题 `background-clip: text` 放在带 `transform` 子级的父级 → 整行透明不可见
- **现象**：重写的「代码如诗·字字珠玑」9 个字 `<span>` 都在 HTML 里，但整行透明、肉眼看不见。
- **原因**：曾把「渐变 + `background-clip: text` + `-webkit-text-fill-color: transparent`」放在**父级 `.hero-title`** 上；
  可子 `<span class="ch">` 带了入场动画的 `transform / opacity`，会**各自形成独立图层**，父级的 `clip` 裁剪不到子级文字 → 文字透明不可见。
- **解决**：把渐变和 `background-clip: text` 移到**每个 `.ch` 自己身上**，父级只留 `filter` 光晕；后面改白色发光字时，`.ch` 直接 `color: #fff; -webkit-text-fill-color: #fff;` 即可（无需 clip）。
  - 经验：**凡是用 `background-clip:text` 做文字渐变/特效，clip 必须放在最终承载文字的那个元素上**，绝不能隔着带 transform 的子层。

### 坑 11：hero 标题在宽屏下不居中（`position: absolute` + `width: 100%` + `left: auto`）
- **现象**：标题整行偏右，宽屏下看着明显不居中。
- **原因**：`.page-title` 是 `position: absolute`，`width: 100%` 解析到**整屏宽**，但没设 `left/right` → `left: auto` 落到**居中 `.container`（1000px 卡片）的静态左缘**。
  于是「盒子宽 = 整屏宽，左缘却偏到 1000px 卡片的左缘」，宽屏下整行被带向右。
- **解决**：给 `.hero-title` 显式锚定到视口并 flex 居中——
  `left: 0; right: 0; display: flex; justify-content: center;`（双保险，`left/right:0` + `text-align:center` 都已具备，flex 兜底）。

### 坑 12：首页背景图在大屏幕上看不到代码（`cover` + `about.jpg` 裁剪）
- **现象**：大屏幕下 hero 背景里的代码看不见，只有**缩小浏览器窗口**才露出来；缩到很窄之后才看到代码。
- **原因**：首页 `.page-bg.about-bg` 用的是 `static/img/about.jpg`（一张 MacBook 照片：上半是代码屏、**下半是键盘**）。
  `.page-bg` 高固定 `400px`、宽 `100vw`、`background-size: cover`、默认 `background-position: 0 0`（左上角）。
  - 宽屏下 `cover` 按**宽度**放大照片，只能看到照片**顶部一条窄带**，而 about.jpg 顶部刚好是暗角/少量代码，键盘被压在下面 → 代码几乎看不见；
  - 缩小窗口后 `cover` 切换成按**高度**约束，露出更多竖向区域，代码才出现。
- **解决**：把首页 header 的 class 从 `about-bg` 换成 `code-bg`，新增规则改用 `static/img/bg.jpg`（一张**纯代码屏**图，没有键盘干扰），并 `background-position: center`。
  `bg.jpg` 整屏都是代码，配合居中裁剪，**任意宽度都能露出代码**；另加暗色兜底 `background-color: #1a1a2e`（图片加载前不会是灰底）。
  - 经验：hero 背景若用 `cover` + 固定矮高，选「主体铺满整图」的图片（如纯代码屏），比「局部有内容」的照片（如带键盘的笔记本）鲁棒得多。

---

## 其他运维命令

```bash
# 本地构建
hugo.exe --minify

# 旧 Typecho 评论迁移到 Giscus（已迁移过 37 条，一般无需重跑）
GITHUB_TOKEN=xxx python3 scripts/migrate_comments_to_giscus.py          # 全量
GITHUB_TOKEN=xxx python3 scripts/migrate_comments_to_giscus.py --only <slug>   # 单篇
GITHUB_TOKEN=xxx python3 scripts/migrate_comments_to_giscus.py --verify       # 校验

# 推送到 GitHub（触发 Cloudflare 部署）
git add -A && git commit -m "..." && git push origin main
```

---

## 备注

- 本 README 记录的 Decap 自托管 OAuth 方案（弹窗 + postMessage 握手 + `/api/v3` 反代）是针对 **Decap 3.3.3 + Cloudflare Pages** 验证通过的版本。升级 Decap 大版本时，建议重新核对其 GitHub 鉴权实现（不同版本握手协议可能变化）。
- 已沉淀为可复用 Skill：`decap-cloudflare-oauth`（用户级 skills 目录）。
