---
title: 宝塔控制面板如何安装SSL证书？
slug: baota-ssl
tags: ["服务器"]
categories: ["yuanquan"]
date: 2026-10-17
---

## 购买服务器
购买云服务器，分2种情况。一种是购买国内服务器，另一种是购买国外服务器。

具体参考这篇文章：**[如何购买便宜、稳定、速度快的云服务器？](https://inurl.top/archives/yunfuwuqi/)**

## 申请SSL证书

推荐用[https://ssl.inurl.link](https://inurl.link/sslxuqian)，免费，自动续签1年（每隔90天自动续签，全程不需要手动），因为你现在买一个单域名的ssl证书最低是15元。

打开 [https://ssl.inurl.link](https://inurl.link/sslxuqian) 后，注册登录，点击申请。

按照这个教程先解析DNS，验证一下域名，才能下载证书。

参考教程：**[SSL续签工具---如何解析DNS？](https://inurl.top/archives/jiexidns/)**

然后打开域名管理，下载证书

![](https://img.inurl.link/i/c7521faf-70a8-4b28-9099-ea3918cf6d29)

## 部署SSL证书

将下载下来的SSL证书，用文本打开。再打开宝塔控制面板，网站管理，找到SSL选项，将证书复制粘贴到宝塔里面

![](https://img.inurl.link/i/3b9be180-34ff-47a4-82d2-601d4dc23383)

保存后，识别到证书了。

![](https://img.inurl.link/i/0fe083f8-850f-49f2-be65-83c1f93f5db9)





























