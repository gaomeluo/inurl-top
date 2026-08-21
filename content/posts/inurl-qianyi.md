---
title: 我把我这个网站迁移到一个0成本平台上了
slug: inurl-qianyi
date: 2026-08-21
cover: "https://img.inurl.link/i/65a94445-c027-49b1-8d28-8c67cfe17848"
tags: ["服务器"]
categories: ["yuanquan"]
---

![](https://img.inurl.link/i/65a94445-c027-49b1-8d28-8c67cfe17848)
如图，你现在看到的这个网站就是我之前网站的样子，还原度99.8%。

### 网址：[https://inurl.top/](https://inurl.top/)

## 我为什么要迁移网站？

当初为了懒得备案，也因为本站有一些不可描述的内容，所以选择海外服务器：[vultr](https://inurl.link/vultr)
每月的消费是6美刀。
![](https://img.inurl.link/i/d4df3f10-f4da-4df1-adff-ac8957f1342c)

以上是消费账单。
之所以选[vultr](https://inurl.link/vultr)服务器，是因为这个服务器在海外还是非常出名的，价格不贵，还能更换公网IP。
（如果你需要海外服务器，不妨PING一下他的节点，看看速度咋样，**传送门：h[ttps://ping.inurl.link/vultr/](ttps://ping.inurl.link/vultr/)**）

很大一部分原因是为了开源节流，我才决定把网站迁到cloudcflare上。

#### 除了域名要钱，其他成本为0

废话不多说了，直接上干货吧。

## 一、技术架构如下：

| 角色 | 用的技术 | 一句话说明 |
|------|----------|------------|
| 网页生成 | **Hugo**（静态站点生成器 / Static Site Generator） | 把 Markdown 文章 + 模板，编译成一堆纯 HTML 文件 |
| 托管 / 运行 | **Cloudflare Pages**（云端静态托管 + 无服务器函数） | 免费、全球加速、自带「云端小程序」能力 |
| 代码 & 文章存储 | **GitHub 仓库**（相当于云端硬盘） | 文章就是仓库里的 `.md` 文件，改文章 = 改仓库文件 |
| 文章后台 | 自研纯静态页面 `static/editor.html` | 浏览器里直接写文章，免装任何软件 |
| 登录授权 | **GitHub OAuth**（第三方登录授权协议） | 用你的 GitHub 账号登录后台 |

**这是一个纯静态网站，但也可以理解为一个非纯静态网站。**

因为动态网站的文章发布功能它都有，基本上跟你正常部署网站的功能一样。

## 二、整体架构

![](https://img.inurl.link/i/70e7e9b3-eb49-402a-a082-55cf184625ac)

- **访客**打开网页 → 由 Cloudflare 的 CDN（内容分发网络，把文件缓存到离用户最近的节点）返回静态页面；
- **站长**打开 `/editor.html` → 用 GitHub 账号登录后，通过 Functions（云端小程序）读写 GitHub 仓库里的文章；
- 侧边栏的「每日一图」由 `bing-image` 函数每天从微软 Bing 拉一张图。

## 三、先看懂两条「数据流」（很重要）

新手最容易懵的一点：**「站点跑在 Cloudflare 上，为什么还要 GitHub？」**
因为 Cloudflare 负责「跑」和「加速」，GitHub 负责「存」和「记版本」。两条流分开看就清楚了：

**① 部署流（改代码 / 改配置时走这条）**

```
你本地改文件 → git push 到 GitHub → Cloudflare 检测到新提交 → 自动 hugo 构建 → 全球 CDN 上线
```

**② 写作流（用网页后台写文章时走这条）**

```
后台写文章点「发布」 → 函数把 .md 写进 GitHub 仓库（= 一次 commit）→ Cloudflare 自动重新构建 → 文章上线
```

> 记住一句话：**GitHub 是「源头」，Cloudflare 是「窗口」**。后台写文章本质上也是在改 GitHub 仓库，所以登录后台要用 GitHub 账号。下面第 4 步的 OAuth 应用，就是给后台一把「经你授权后改你仓库」的钥匙。

## 四、开始前的准备

| 需要 | 免费吗 | 干嘛用 |
|------|--------|--------|
| 电脑（Win / Mac / Linux 都行） | ✅ | 本地写代码、跑命令 |
| [Git](https://git-scm.com/) | ✅ | 把代码同步到 GitHub |
| [Hugo](https://gohugo.io/)（**扩展版 / extended**） | ✅ | 把文章编译成网页 |
| [GitHub](https://github.com/) 账号 | ✅ | 存代码 + 后台登录账号 |
| [Cloudflare](https://www.cloudflare.com/) 账号 | ✅ | 免费托管站点 |

**安装 Hugo（任选一种，必须装扩展版）：**

```bash
# macOS（用 Homebrew 包管理器）
brew install hugo

# Windows（用 Chocolatey 包管理器）
choco install hugo-extended

# 验证安装成功（能看到版本号就行）
hugo version
```

> 小知识：Hugo 有「标准版」和「扩展版」。本站用了 SCSS、图片处理等特性，**必须装扩展版（extended）**，否则构建会报错。Windows 上 `choco install hugo-extended` 装的就是扩展版；macOS 用 `brew install hugo` 默认已是扩展版。

**装 Git（若还没装）：** 去 <https://git-scm.com/downloads> 下载对应系统版本，一路下一步即可。装完在命令行输入 `git --version` 能看到版本号就成功。

## 五、拿到源码并本地运行

#### 方式 A：用 Git 克隆（推荐，方便后续更新）

```bash
git clone https://github.com/gaomeluo/inurl-top.git
cd inurl.top
hugo server -D        # 启动本地预览，带 -D 才会显示草稿
```

终端会输出一个地址（通常是 `http://localhost:1313/`），浏览器打开就能看到站点，改文件会自动刷新。

#### 方式 B：直接解压源码包

如果你拿到的是 `inurl.top-source.zip`：

```bash
unzip inurl.top-source.zip
cd inurl.top
hugo server
```

> 源码包里**已经排除了**构建产物（`public/`）和迁移备份（`_server_export/`），解压即是干净可运行的源码。

### 目录结构一览

![](https://img.inurl.link/i/ec3f481d-e3a2-46c4-837e-1fe4f3f893b0)


关键目录记住三个就够：
- `content/` —— 你的文章都在这里（Markdown 文件，后台可直接编辑）；
- `layouts/` —— 页面长什么样（模板）；
- `functions/` —— 云端小程序（登录、接口代理等）。

---

## 六、把站点部署上线（Cloudflare Pages）

本地能跑之后，把它发布到互联网，让所有人都能访问。

### 第 1 步：把代码推到 GitHub

```bash
git add -A
git commit -m "first commit"
git push origin main
```

> 如果你是用「方式 B 解压包」拿到的源码，需要先在自己 GitHub 上**新建一个空仓库**，再把本地代码关联并推上去（仓库名随意，例如 `my-blog`）。

### 第 2 步：Cloudflare 关联 GitHub

1. 登录 Cloudflare 控制台 → 左侧 **Workers 和 Pages** → **创建** → 选 **Pages**；
2. 选 **连接到 Git** → 授权并选中你的仓库（如 `gaomeluo/inurl-top`）；
3. 构建设置填写如下（对照下图）：

| 配置项 | 填写值 | 说明 |
|--------|--------|------|
| 框架预设（Framework preset） | `Hugo` | 让 Cloudflare 自动装好 Hugo |
| 构建命令（Build command） | `hugo --minify` | 编译并压缩网页 |
| 构建输出目录（Build output） | `public` | 编译结果放在这里 |
| 分支 | `main` | 监听这个分支的推送 |

![](https://img.inurl.link/i/4ec567f4-9afd-41d3-8833-6e630c21edd7)

> 若 Cloudflare 默认的 Hugo 版本太旧导致构建失败，可在「环境变量」里加 `HUGO_VERSION = 0.145.0`（见上图右下角提示）。

### 第 3 步：配置登录所需的环境变量

后台要用 GitHub 账号登录，需要两个环境变量（在构建设置的 **环境变量 / Environment Variables** 里加，**作用域选 Production**）：

| 变量名 | 值 | 说明 |
|--------|----|------|
| `GITHUB_CLIENT_ID` | `Ov23liJ4fvPrfXbIBSdq` | GitHub OAuth 应用的 ID（公开） |
| `GITHUB_CLIENT_SECRET` | 你自己的 Secret | 见下方「第 4 步：创建 GitHub OAuth 应用」 |

> ⚠️ **改完环境变量后必须重新部署一次**（点「重试部署」或推一个小提交），否则函数读不到新值。

### 第 4 步：创建 GitHub OAuth 应用（仅需一次）

1. GitHub → 右上角头像 → **Settings** → 最下方 **Developer settings** → **OAuth Apps** → **New OAuth App**；
2. 按下图填写：
   - **Application name**：`inurl.top`
   - **Homepage URL**：`https://inurl.top`
   - **Authorization callback URL**：`https://inurl.top/auth/callback`
3. 创建后得到 **Client ID**（填第 3 步的环境变量）和 **Client Secret**（填第 3 步的环境变量）；
4. 保存，触发一次部署。

![](https://img.inurl.link/i/16ba98b6-3d40-4c6d-a1a2-f9512e9fd61d)

> 注意：回调地址（Authorization callback URL）**必须**是 `https://你的域名/auth/callback`，否则登录会卡在授权页回不来。

### 部署流程总览

![](https://img.inurl.link/i/25258f1b-5e0a-4c5c-ba48-30c14823bca5)

之后你只要 `git push`，Cloudflare 会在 1–2 分钟内自动重新构建并上线，**不需要手动操作**。

---

## 七、用网页后台写文章

后台是一个纯网页，地址是 `https://你的域名/editor.html`。

### 登录流程

![](https://img.inurl.link/i/61612031-0f68-4f9a-8dcb-601a4cd75822)

1. 打开 `/editor.html` → 点 **使用 GitHub 登录**；
2. 弹出小窗与本站完成握手 → 跳转到 GitHub 授权页；
3. 点「Authorize」同意授权；
4. 小窗自动关闭，token（登录凭证）存在你浏览器本地，进入后台。

> 登录即代表你授权本站在你的 GitHub 仓库 `main` 分支提交改动。**保存 = 一次提交 = 自动上线**（见第二节「写作流」）。

### 后台界面一览

![](https://img.inurl.link/i/b0f583ed-09ec-4c97-9c9d-8c72d45c6972)

- **顶栏**：左侧是品牌字「⌘ 顶级索引 / 文章后台」+「退出」；右侧是「＋ 新建 / 保存草稿 / 发布」。
- **左侧文章列表**：自动列举 `content/` 下所有 `.md`（含子目录），按日期倒序；顶部搜索框按标题 / 文件名过滤。
- **右侧编辑器**：
  - **大标题输入框** + 下方一行紧凑元信息（发布路径、标签、分类、封面图、日期；标签/分类为下拉，可直接输入新值）；
  - **工具栏**（选中文字点按钮即可加格式，**免手写 Markdown**）：加粗、斜体、标题、插入超链接、插入外链图片、上传本地图片入仓、引用、行内代码、代码块、无序/有序列表；
  - 下半是 Markdown 正文（带行号）与**实时预览**分屏。

## 八、各功能详解

- **保存草稿** → 写入 `draft: true`，Hugo 生产构建默认不收录，文章不会上线，可继续修改；
- **发布** → 去掉草稿标记并补齐 `date`（留空时取今天），构建后正常上线；
- **本地图片上传入仓** → 点工具栏「上传」图标 → 选图 → 以 base64 存入仓库 `static/img/uploads/`，自动在光标处插入 `![]( /img/uploads/文件名 )`；
- **删除** → 有二次确认，删的是仓库里的 `.md`；
- **改发布路径（slug）** → 已发布文章也能改 slug（例如 `apitoken` → `apitoken-v2`），保存后文件会移动到新路径并删掉旧的；**注意：原 URL 会立即 404**，要保旧链接请在 `functions/archives/[[path]].js` 里加 301 重定向；
- **未保存提醒** → 有改动但未保存时，离开页面会弹浏览器原生确认，防丢稿。

看到这里，你基本上就能成功的实现0成本搭建一个“动态”的个人网站了。

当然这网站是海外的服务器，所以速度上肯定跟不上国内的服务器。如果你想要速度，那么建议选择国内的服务器，国内服务器建站教程参考：**《[从0到1，手把手教你创建网站【保姆级教程】](https://blog.gaomeluo.com/archives/jianzhan/)》**

