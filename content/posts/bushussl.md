---
title: 如何部署SSL证书？
slug: bushussl
tags: ["服务器"]
categories: ["yuanquan"]
date: 2026-10-14
---


书接上文，上一篇文章我写了【[SSL续签工具---如何解析DNS？](https://inurl.top/archives/jiexidns/)】。

接下来教大家如何部署SSL证书。

域名添加成功了之后，先获取SSL证书。

打开SSL续签工具的域名管理页面。

地址：[https://ssl.inurl.link/console.html#domains](https://ssl.inurl.link/console.html#domains)

![](https://img.inurl.link/i/49f72e71-21ef-4f24-8727-0bc4c496cd84)

如上图，点击右侧位置的“签发”按钮。（我这里证书已经下来了，所以是“续签”状态）

![](https://img.inurl.link/i/e58e4310-49c7-4401-a508-c284d3f1cc47)

点击右侧的“下载证书”，出现上图这个弹窗，按照箭头下载“你的域名.pem”和“你的域名.key”文件即可。

下载完成之后，接下来就要把你这个证书安装部署好，这样你的域名就可以https正常访问了。

因为每个用户服务器的环境不一样，接下来，我将以3个稍微有代表性的环境按照证书为例。

#### 1、[nginx环境安装SSL证书](https://inurl.top/archives/nginx-ssl/)

#### 2、[IIS环境安装SSL证书](https://inurl.top/archives/iis-ssl/)

#### 3、[宝塔环境安装SSL证书](https://inurl.top/archives/baota-ssl/)



