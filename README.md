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
├── functions/              # ★ Cloudflare Pages Functions（自托管 OAuth 核心）
│   ├── auth.js                       # GET /auth         —— 弹窗握手页
│   ├── auth/callback.js             # GET /auth/callback —— 换 token 并回传
│   └── api/v3/[[path]].js          # /api/v3/*      —— GitHub API 反代
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
