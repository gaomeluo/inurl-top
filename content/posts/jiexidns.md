---
title: SSL续签工具---如何解析DNS？
slug: jiexidns
date: 2026-10-14
---

## 一、注册登录SSL续签工具
打开网址：[https://ssl.inurl.link/](https://inurl.link/sslxuqian)

![](https://img.inurl.link/i/751b165d-28a0-4e11-9c70-34923f6f70b9)

注册登录，系统会给你发一个验证邮件，去邮箱里打开这个邮件就注册成功了。

![](https://img.inurl.link/i/65b6d9a7-09b9-41db-a401-7e183b494d5b)

打开后台，首页如上图，点击“立即申请”

![](https://img.inurl.link/i/3cace8c6-cdd4-4100-bd5a-0972af2c29ba)

点击右边的“添加域名”，出现一个弹窗，然后填写你要申请SSL证书的域名，注意不要加“https://”和“/”，然后点击“添加并获取 DNS 指引”

![](https://img.inurl.link/i/4e8c03d7-d430-4717-a04d-09f1c3bd53fc)

拖住弹窗右边的滚动条，或者往下滑鼠标滑轮，到最下方，复制“主机记录”和“记录值”。

然后在域名注册商或者域名托管商那里解析域名，这里以阿里云为例。
打开阿里云域名管理页，然后解析该域名。

![](https://img.inurl.link/i/14497f2b-bea2-4158-91f3-115b0a724f02)

按照上图的指引，复制填写，最后点击“确定”。

然后打开刚才“SSL续签工具”网站。点击“我已添加解析，进入域名管理”

![](https://img.inurl.link/i/54c8d6ae-a9fe-4852-b287-c7c279d72b29)

等待几分钟，如果还没有解析成功，可以点击“检查解析”。

出现“DNS 已验证”，说明解析成功了。