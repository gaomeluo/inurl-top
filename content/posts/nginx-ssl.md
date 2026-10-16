---
title: nginx环境下如何安装SSL证书？
slug: nginx-ssl
tags: ["服务器"]
categories: ["yuanquan"]
date: 2026-10-16
---

## 购买服务器
购买云服务器，分2种情况。一种是购买国内服务器，另一种是购买国外服务器。

具体参考这篇文章：**[如何购买便宜、稳定、速度快的云服务器？](https://inurl.top/archives/yunfuwuqi/)**

## 安装Nginx服务
登录到服务器后，输入以下命令，安装Nginx服务。（不同环境、命令略有差异）

OpenCloudOS环境：`yum install nginx -y`

CentOS环境：`yum install nginx -y`

Rocky环境：`dnf install nginx -y`

Debian环境：`apt install nginx -y`

Ubuntu环境：`apt install nginx -y`

启动nginx服务器

`service nginx start`

## 通过域名访问网站

添加一条DNS的A记录，将域名解析到你云服务器的IP地址上即可。

![](https://img.inurl.link/i/894f7614-781c-4177-946f-9e8a8c4e3f2e)

此时，可以通过域名访问刚刚的服务器了。

![](https://img.inurl.link/i/2f0265f4-36b7-4f72-8cab-bea25692f9c6)

## 申请SSL证书

推荐用[https://ssl.inurl.link](https://inurl.link/sslxuqian)，免费，自动续签1年（每隔90天自动续签，全程不需要手动），因为你现在买一个单域名的ssl证书最低是15元。

打开 [https://ssl.inurl.link](https://inurl.link/sslxuqian) 后，注册登录，点击申请。

按照这个教程先解析DNS，验证一下域名，才能下载证书。

参考教程：**[SSL续签工具---如何解析DNS？](https://inurl.top/archives/jiexidns/)**

然后打开域名管理，下载证书

![](https://img.inurl.link/i/c7521faf-70a8-4b28-9099-ea3918cf6d29)

## 部署SSL证书

nginx配置https站点
配置指令（请将 ssl.inurl.link 替换成自己的域名）

```
server {
     #SSL 默认访问端口号为 443
     listen 443 ssl; 
     #请填写绑定证书的域名
     server_name ssl.inurl.link; 
     #请填写证书文件的相对路径或绝对路径
     ssl_certificate ssl.inurl.link.crt; 
     #请填写私钥文件的相对路径或绝对路径
     ssl_certificate_key ssl.inurl.link.key; 
     ssl_session_timeout 5m;
     #请按照以下协议配置
     ssl_protocols TLSv1.2 TLSv1.3; 
     #请按照以下套件配置，配置加密套件，写法遵循 openssl 标准。
     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE; 
     ssl_prefer_server_ciphers on;
     location / {
         #网站主页路径。此路径仅供参考，具体请您按照实际目录操作。
         #例如，您的网站主页在 Nginx 服务器的 /etc/www 目录下，则请修改 root 后面的 html 为 /etc/www。
         root html; 
         index  index.html index.htm;
     }
 }
```

通过执行以下命令验证配置文件问题。

`nginx -t`

通过执行以下命令重载 Nginx。

`nginx -s reload`

重载成功，即可使用 https://ssl.inurl.link 进行访问。
