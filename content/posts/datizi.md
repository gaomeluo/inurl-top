---
title: "【教程】如何搭建梯子（VPN）？"
slug: "datizi"
date: "2023-08-18T14:07:00"
draft: false
categories: ["fuli"]
---

自己搭建的科学上网工具跟市面上卖的那些多线路的翻墙工具有啥区别？



自己搭建的科学上网工具稳定，安全而且速度快。而VPN服务商卖的也是自己购买的服务器搭建的梯子，多条线路就是多个服务器，然后卖给客户共享这个服务器。由于使用的人多，这个IP就不纯净，也就不安全了。



自己搭梯子就是用更少的钱去独享这个科学上网的高速服务；而购买别人的科学上网就是跟众多的人一起同时使用这个翻墙工具，速度肯定不如独享的快速，同时也更不安全。



### 一、服务器选择

搭建梯子必须要用的香港服务器或者海外服务器（比如、日本、韩国、新加坡、美国等服务器）

#### 1、香港服务器推荐

如何找便宜的云服务器，参考下面这篇文章：

##### 【[有哪些香港的服务器值得推荐？](https://blog.gaomeluo.com/archives/xianggangfuwuqi/ "有哪些香港的服务器值得推荐？")】

#### 2、其他海外服务器推荐

如何找便宜的云服务器，参考下面这篇文章：



【[哪些国外的云服务器/VPS便宜？](https://blog.gaomeluo.com/archives/guowaifuwuqi/ "哪些国外的云服务器/VPS便宜？")】



如果你先自己搭建梯子比较麻烦，还可以直接购买，推荐一下我目前用的这款梯子，节点多、非常便宜、稳定。

#### 《[魔戒VPN——节点多、速度快、稳定，推荐！！！](https://inurl.top/archives/mojie/ "魔戒VPN——节点多、速度快、稳定，推荐！！！")》





### 二、梯子搭建教程



本梯子使用的V2ray多合一脚本，支持VMESS+websocket+TLS+Nginx、VLESS+TCP+XTLS、VLESS+TCP+TLS等。



V2ray一键脚本功能强大，支持常规VMESS协议、VMESS+websocket+TLS+Nginx、VLESS+TCP+XTLS、VLESS+TCP+TLS等多种组合，支持CentOS 7/8、Ubuntu 16.04以上、Debian 8以上系统，以及相关衍生系统。



#### 1、V2ray一键脚本使用步骤如下：



##### ①、境外服务器准备工作

如果用VMESS+WS+TLS或者VLESS系列协议，则还需一个域名。对域名没有要求，国内/国外注册的都可以，不需要备案，不会影响使用，也不会带来安全/隐私上的问题。



值得一提的是本V2ray一键脚本支持ipv6 only服务器，但是不建议用只有ipv6的VPS用来科学上网。



##### ②、开放80和443端口

如果vps运营商开启了防火墙（阿里云、Ucloud、腾讯云、AWS、GCP等商家默认有，搬瓦工/hostdare/vultr等商家默认关闭），请先登录vps管理后台放行80和443端口，否则可能会导致获取证书失败。此外，本脚本支持上传自定义证书，可跳过申请证书这一步，也可用在NAT VPS上。



##### ③、ssh连接到服务器。

需要下载一个ssh客户端，然后用ssh登录服务器。（购买服务器后，会给你相关的IP、帐号、密码）教程略，网上有很多，不会的自己搜一下。



##### ④、命令安装脚本



复制（或手动输入）下面命令到终端



    bash <(curl -sL https://storage.googleapis.com/tiziblog/setup.sh)



按回车键，将出现如下操作菜单。

如果菜单没出现，CentOS系统请输入



    yum install -y curl



Ubuntu/Debian系统请输入



    sudo apt install -y curl



然后再次运行上面的命令：



![](https://inurl.top/usr/uploads/2023/08/644052004.png)



#### 目前V2ray一键脚本支持以下功能：

VMESS，即最普通的V2ray服务器，没有伪装，也不是VLESS

VMESS+KCP，传输协议使用mKCP，VPS线路不好时可能有奇效

VMESS+TCP+TLS，带伪装的V2ray，不能过CDN中转

VMESS+WS+TLS，即最通用的V2ray伪装方式，能过CDN中转，推荐使用

VLESS+KCP，传输协议使用mKCP

VLESS+TCP+TLS，通用的VLESS版本，不能过CDN中转，但比VMESS+TCP+TLS方式性能更好

VLESS+WS+TLS，基于websocket的V2ray伪装VLESS版本，能过CDN中转，有过CDN情况下推荐使用

VLESS+TCP+XTLS，目前最强悍的VLESS+XTLS组合，强力推荐使用（但是支持的客户端少一些）

trojan，轻量级的伪装协议

trojan+XTLS，trojan加强版，使用XTLS技术来提升性能



**注意：**目前一些客户端不支持VLESS协议，或者不支持XTLS，请按照自己的情况选择组合

##### 5. 按照自己的需求选择一个方式。

例如6，然后回车。接着脚本会让你输入一些信息，也可以直接按回车使用默认值。需要注意的是，对于要输入伪装域名的情况，如果服务器上有网站在运行，请联系运维再执行脚本，否则可能导致原来网站无法访问！



![](https://inurl.top/usr/uploads/2023/08/3210985378.png)



##### 6. 脚本接下来会自动运行，一切顺利的话结束后会输出配置信息：



![](https://inurl.top/usr/uploads/2023/08/1184729940.png)



到此服务端配置完毕，服务器可能会自动重启（没提示重启则不需要），windows终端出现“disconnected”，mac出现“closed by remote host”说明服务器成功重启了。



对于VLESS协议、VMESS+WS+TLS的组合，网页上输入伪装域名，能正常打开伪装站，说明服务端已经正确配置好。如果运行过程中出现问题，请在本页面下方查找解决方法或留言。



最后，刚搭建好V2ray后不要猛上流量，否则会导致被限速、端口被墙，严重可能导致ip被墙。



### 三、客户端使用、配置教程



#### 1、路由器配置（推荐）



在路由器里配置梯子最省事，配置完成后，屋里所有的设备都可以科学上网，包括看奈飞视频、Disney+视频等，为此，我单独写了个教程，如下：

##### 【[Clash for OpenWRT（软路由）实现全屋设备科学上网](https://inurl.top/archives/ClashforOpenWRT/ "Clash for OpenWRT（软路由）实现全屋设备科学上网")】



#### 2、Windows客户端



##### Clash for Windows客户端：[传送门](https://github.com/Dreamacro/clash "传送门")



Clash 是一个使用 Go 语言编写、基于规则的跨平台代理核心程序。Clash目前有Windows、MacOS、Android等多个平台的GUI程序，支持SS/V2ray/Trojan多种协议，功能强大。



本人目前用的就是这个客户端。



##### V2rayN客户端：[传送门](https://github.com/2dust/v2rayN/releases "传送门")



V2rayN是一个基于V2ray核心的Windows客户端，功能强大且支持多种协议。



#### 3、安卓客户端



##### v2rayNG客户端：[传送门](https://github.com/2dust/v2rayNG/releases "传送门")

v2rayNG 是安卓平台上一款基于v2ray核心的简洁、功能强大的客户端。



##### Clash客户端：[传送门](http://iil.ink/androidclash "传送门")



#### 4、ios客户端



Shadowrocket 是ios系统上一款非常知名的科学上网/代理应用，logo是一个发射的火箭，因此别名小火箭。小火箭支持http(s)/socks5/ss/ssr/vmess/trojan等多种网络协议，功能非常强大。提供中文、英文、繁体三种语言，界面简洁好用。



国内的APP store无法搜索和下载小火箭，需要使用国外的apple id下载使用，这个可以直接淘宝解决，以及购买一个国外的apple id帐号。



#### 5、Mac客户端



##### ClashX客户端：[传送门](https://github.com/yichengchen/clashX/releases "传送门")

ClashX界面美观功能强大，支持vmess、shadowsocks、trojan等多种协议，建议使用。Qv2ray支持SS、SSR、VLESS、trojan、trojan-go等多种协议(需安装插件)，也推荐使用。



### 扩展阅读

梯子搭好了，就可以畅游国外的网站，可以搜索，也可以官网奈飞视频、Disney+视频。具体参考下面的教程：



【[国内如何观看迪士尼Disney+视频？](https://inurl.top/archives/Disney/ "国内如何观看迪士尼Disney+视频？")】

【[如何加入Spotify家庭组会员？](https://inurl.top/archives/spotifyjiatinghuiyuan/ "如何加入Spotify家庭组会员？")】

【[如何观看奈飞Netflix里的视频？](https://inurl.top/archives/lookNetflix/ "如何观看奈飞Netflix里的视频？")】

【[如何加入YouTube Premium家庭组会员？](https://inurl.top/archives/Premium/ "如何加入YouTube Premium家庭组会员？")】

【[5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！](https://inurl.top/archives/shipinvip/ "5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！")】
