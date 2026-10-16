---
title: IIS环境下如何安装SSL证书？
slug: iis-ssl
tags: ["服务器"]
categories: ["yuanquan"]
date: 2026-10-16
---

## 购买服务器
购买云服务器，分2种情况。一种是购买国内服务器，另一种是购买国外服务器。

具体参考这篇文章：**[如何购买便宜、稳定、速度快的云服务器？](https://inurl.top/archives/yunfuwuqi/)**

## 申请、下载SSL证书

推荐用[https://ssl.inurl.link](https://inurl.link/sslxuqian)，免费，自动续签1年（每隔90天自动续签，全程不需要手动），因为你现在买一个单域名的ssl证书最低是15元。

打开 [https://ssl.inurl.link](https://inurl.link/sslxuqian) 后，注册登录，点击申请。

按照这个教程先解析DNS，验证一下域名，才能下载证书。

参考教程：**[SSL续签工具---如何解析DNS？](https://inurl.top/archives/jiexidns/)**

然后打开域名管理，下载证书

![](https://img.inurl.link/i/c7521faf-70a8-4b28-9099-ea3918cf6d29)

获得两个文件，存放在文件夹中，并将这两个文件上传到服务器桌面上

![](https://img.inurl.link/i/73895eee-4714-47ea-b0d6-89dbaed74550)

## 将域名解析到服务器

## 通过域名访问网站

添加一条DNS的A记录，将域名解析到你云服务器的IP地址上即可。

![](https://img.inurl.link/i/894f7614-781c-4177-946f-9e8a8c4e3f2e)

此时，可以通过域名访问刚刚的服务器了。

![](https://img.inurl.link/i/632afd28-9be5-4b2b-8aad-79e0b10611bc)

## 配置证书

选择【服务器证书】，双击进入

![](https://img.inurl.link/i/091e4fc3-00ef-4198-969f-08926e4b27cd)

点击【导入】

![](https://img.inurl.link/i/15aa9fe6-21fa-42c7-a461-a3315f2a4fb3)

选择证书

![](https://img.inurl.link/i/850894df-b30e-4cc6-a6cc-116a308e83cf)

选择证书文件，并【打开】

![](https://img.inurl.link/i/1d4d1462-04cc-4f89-9fe9-0927aed19ec9)

输入密码，点击【确定】

![](https://img.inurl.link/i/e6b0d0d3-978a-480e-b539-98a89cf8efad)

此时可以看到证书已经导入

![](https://img.inurl.link/i/260d72c1-5506-41ca-b8a2-bb30bfaf2d21)

## 设置站点SSL证书

点击站点、点击右侧的【绑定】

![](https://img.inurl.link/i/52faed31-3e47-4ed4-bfe3-0534990ab14c)

点击【添加】

![](https://img.inurl.link/i/b21e3949-756a-4cb7-97d3-85ea556d3ede)

类型选择：https

![](https://img.inurl.link/i/bac63245-86e7-43c5-92ed-1b1464c7d365)

SSL证书：选择刚刚导入的证书即可，点击【确定】即可。

![](https://img.inurl.link/i/23903964-4f1f-4b92-b080-841c883866e5)

此时可以看到绑定的443端口了。

![](https://img.inurl.link/i/d3bd4d26-cbde-41a7-9887-05f00e2932a0)

通过https访问，发现已经生效了，证书也正常。

![](https://img.inurl.link/i/17915e8f-3439-49e8-847f-9c6a3c093829)