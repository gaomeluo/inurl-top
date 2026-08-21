---
title: 我把我这个网站迁移到一个0成本平台上了
slug: inurl-qianyi
date: 2026-08-21
draft: true
cover: "https://img.inurl.link/i/65a94445-c027-49b1-8d28-8c67cfe17848"
---

![](https://img.inurl.link/i/65a94445-c027-49b1-8d28-8c67cfe17848)
如图，你现在看到的这个网站就是我之前网站的样子，还原度99.8%。

### 网址：https://inurl.top/

## 我为什么要迁移网站？

当初为了懒得备案，也因为本站有一些不可描述的内容，所以选择海外服务器：[vultr](https://inurl.link/vultr)
每月的消费是6美刀。
![](https://img.inurl.link/i/d4df3f10-f4da-4df1-adff-ac8957f1342c)

以上是消费账单。
之所以选[vultr](https://inurl.link/vultr)服务器，是因为这个服务器在海外还是非常出名的，价格不贵，还能更换公网IP。
（如果你需要海外服务器，不妨PING一下他的节点，看看速度咋样，传送门：https://ping.inurl.link/vultr/）

很大一部分原因是为了开源节流，我才决定把网站迁到cloudcflare上。

#### 除了域名要钱，其他成本为0

废话不多说了，直接上干货吧。

技术架构如下：

| 角色 | 用的技术 | 一句话说明 |
|------|----------|------------|
| 网页生成 | **Hugo**（静态站点生成器 / Static Site Generator） | 把 Markdown 文章 + 模板，编译成一堆纯 HTML 文件 |
| 托管 / 运行 | **Cloudflare Pages**（云端静态托管 + 无服务器函数） | 免费、全球加速、自带「云端小程序」能力 |
| 代码 & 文章存储 | **GitHub 仓库**（相当于云端硬盘） | 文章就是仓库里的 `.md` 文件，改文章 = 改仓库文件 |
| 文章后台 | 自研纯静态页面 `static/editor.html` | 浏览器里直接写文章，免装任何软件 |
| 登录授权 | **GitHub OAuth**（第三方登录授权协议） | 用你的 GitHub 账号登录后台 |










