---

title: "如何用自己的服务器搭建ChatGPT？【教程】"
slug: "yunchatgpt"
date: "2023-06-11T18:22:00"
draft: false
categories: ["yuanquan"]
tags: ["如何搭梯子？", "科学上网", "chatgpt"]
views: 4116
---

上一篇教程我们教大家《[国内如何注册OpenAI帐号使用chatgpt？](https://inurl.top/archives/zhucechatgpt/ "国内如何注册OpenAI帐号使用chatgpt？")》



但是也有很多限制，比如说每次都得科学上网才能上的去，梯子工具频繁更换IP对OpenAI帐号也有很大的影响，甚至封号等。



那么用自己的服务器搭建chatgpt，就解决了频繁更换IP的烦恼，如果使用自己的域名还方便记。本文教你如何快速搭建基于OpenAI的ChatGPT。效果图如下：



![](https://inurl.top/usr/uploads/2023/06/979615729.png)



## 一、准备条件

1、云服务器一台

2、域名1个

3、ChatGPT api

## 二、如何部署自己的ChatGPT网站？

### 1、购买服务器

想要搭建自己的ChatGPT网站，我们需要一台境外的云服务器。



如果没有云服务器的小伙伴，这里推荐阿里云的海外轻量云服务器。价格相对便宜，最主要的是稳定，跑chatgpt完全没问题。



**阿里云海外轻量云服务器官网**：

[https://www.aliyun.com/product/swas](https://iil.ink/2a3y2 "https://www.aliyun.com/product/swas")



点击下面的“立即购买”

![](https://inurl.top/usr/uploads/2023/06/82498487.png)



选择亚太地区，docker镜像（可以省去安装docker这一步），建议选择2核2G的内存配置，我选的2核1G感觉有点儿小，而且，价格就相差100来块钱，也不贵。



![](https://inurl.top/usr/uploads/2023/06/3964987586.png)



在购买完成后，应该能在控制台中的轻量应用服务器中看到自己的服务器



![](https://inurl.top/usr/uploads/2023/06/3266820653.png)



在服务器信息中看到自己的ip地址（公）（注意不要泄露出去），点击重置密码，设置你个人喜欢的密码



![](https://inurl.top/usr/uploads/2023/06/2570682873.png)



### 2、环境搭建



在得到ip和你自己的密码后，我们将使用powershell来进行ssh连接到云服务器上



`ssh root@{你的服务器ip}`



然后输入yes，再输入密码，注意密码是没有显示的，不要认为自己没有输入！



![](https://inurl.top/usr/uploads/2023/06/1302075038.png)



在输入进入到终端，输入以下命令



`mkdir chatgpt && cd chatgpt && touch docker-compose.yml`



这是一行包含三个 Bash 命令的串联操作，用于创建一个名为 chatgpt 的新目录，并在其中创建一个名为 docker-compose.yml 的文件。 该命令可以按以下方式分解：



- mkdir chatgpt: 创建一个名为 chatgpt 的新目录。

- cd chatgpt: 进入 chatgpt 目录。

- touch docker-compose.yml: 创建一个名为 docker-compose.yml 的空文件。



![](https://inurl.top/usr/uploads/2023/06/4168616582.png)



输入以下命令：



`nano docker-compose.yml`



会出现以下界面



![](https://inurl.top/usr/uploads/2023/06/4001237211.png)



复制以下内容到里面



    version: '3'

    

    services:

      app:

        image: chenzhaoyu94/chatgpt-web # 总是使用 latest ,更新时重新 pull 该 tag 镜像即可

        restart: unless-stopped

        ports:

          - 3002:3002

        environment:

          OPENAI_API_KEY: {你的token或者你的key}

          OPENAI_API_BASE_URL: {你的token对于的api}

          OPENAI_API_MODEL: gpt-3.5-turbo-0301 #聊天的模型

          AUTH_SECRET_KEY: {password} #密码，防止其他人乱用你的额度

          TIMEOUT_MS: 60000



通过快捷键CTRL+O进行保存，CTRL+X进行退出。



### 3、获取chatgpt API



**key 和 api 的选择有2种方案：**



- OpenAI 官方：需要自备国外信用卡（香港不行），且主机具备访问官方api的能力

- API2D：作者推荐，有完整的文档，不需要主机具备访问官方api的能力，价格约为官方价格的1.5倍



**OpenAI官方：**



![](https://inurl.top/usr/uploads/2023/06/4285903899.png)



自己创建secret key， 官方api的访问网址为：https://api.openai.com



登录需要科学上网：如何登录参考《[国内如何注册OpenAI帐号使用chatgpt？](https://inurl.top/archives/zhucechatgpt/ "国内如何注册OpenAI帐号使用chatgpt？")》



**API2D：**



![](https://inurl.top/usr/uploads/2023/06/1089202889.png)



通过创建自己的forward key， api2d的api访问网址为：https://stream.api2d.net



通过作者的推荐网址进行购买，[https://api2d.com/r/207050](https://iil.ink/api2d "https://api2d.com/r/207050") , 作者可以获得奖励（写教程不易，希望大家可以通过这个链接购买，作者可以获得100p的奖励，用于今后继续创作）



将上述你购买得到的key和api访问网址，填入到docker-compose.yml的文件中，运行



`docker-compose up -d`



命令，即可运行成功！



![](https://inurl.top/usr/uploads/2023/06/3043467183.png)



### 4，如何访问？



最后通过浏览器访问你的ip地址+3002端口即可！

本地部署访问的网址：localhost:3002

服务器部署访问的网址：{你的服务器的公网IP:3002}

想要使用域名访问自己的云chatgpt，只需要将你的域名解析到这个服务器的公网IP即可，网上有大把的教程，这里就不再详述了。

如下图：



![](https://inurl.top/usr/uploads/2023/06/789186257.png)



到这里，你自己的chatgpt已经搭建成功了！



#### 相关阅读：

[开源AI处理工具-APT](https://blog.gaomeluo.com/archives/aiapt/ "开源AI处理工具-APT")

[这几款免费的AI工具值得推荐](https://blog.gaomeluo.com/archives/aigongju/ "这几款免费的AI工具值得推荐")
