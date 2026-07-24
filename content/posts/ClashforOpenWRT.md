---
title: Clash for OpenWRT（软路由）实现全屋设备科学上网
slug: ClashforOpenWRT
date: 2023-05-17T18:32:00
draft: false
views: 77219
description: 要实现全屋设备科学上网的方式有很多，最主要的是你需要有一个安全、稳定、可靠的机场。还有载体设备（比如软路由、可以刷固件的路由器等）
categories:
  - yuanquan
tags:
  - 如何搭梯子？
  - Netflix奈飞
  - google
  - 科学上网
---
如果不想实现全屋覆盖，可以看这篇文章《[【教程】如何搭建梯子（VPN）？](https://inurl.top/archives/datizi/ "【教程】如何搭建梯子（VPN）？")》

要实现全屋设备科学上网的方式有很多，最主要的是你需要有一个安全、稳定、可靠的机场。还有载体设备（比如软路由、可以刷固件的路由器等）

今天我们来讲一下我是如何用软路由实现全屋设备科学上网的。

## 一、科学上网需要哪些东西？

#### 1、机场

机场我推荐下文的这个，用了很多年了，稳得一批！

#### 《[魔戒VPN——节点多、速度快、稳定，推荐！！！](https://inurl.top/archives/mojie/ "魔戒VPN——节点多、速度快、稳定，推荐！！！")》

#### 2、软路由

家用软路由。



#### 3、固态硬盘

这款软路由是内置硬盘的，带硬盘的套餐要贵的多，所以需要单独购买一个硬盘，单独购买硬盘呀便宜的多。



## 二、Clash for OpenWRT安装教程

软路由买回来之后需要给这个软路由刷上OpenWRT系统，一般店家会给你提供个刷机视频教程，按照教程来就可以安装这个系统，跟电脑装win系统差不多，实在是不会刷的，可以在评论区里说一下，人多的话，我可以搞个教程。

1、给软路由插上网线后，ping一下是否有网。

![1-20-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1005519039.jpg)

2、点击服务，再点击open clash

![2-17-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/157203892.jpg)

3、找到全局设置、模式设置、绕过大陆，给启用一下

![3-14-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3386698292.jpg)

4、全局设置、基本设置、内核编译版本（因为我这里处理器的架构是X86_64）、选择内核编译版本就选择x86_64的。仅代理命中规则流量选择启用

![3-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1282495068.jpg)

5、基本设置完成以后，点击应用配置

![4-15-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/773526367.jpg)

6、应用配置完成以后，我们需要再次来到全局设置、版本更新、一键检查更新（需要把内核给下载下来）、点击确定

![5-13-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/432836470.jpg)

7、有版本号，证明更新成功了

![6-10-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3128030149.jpg)

8、到这里配置差不多已经完成了，现在只需要订阅一个节点就行了。Openclash、配置文件订阅、添加、配置名称随便填、粘贴订阅地址、在线订阅转换（启用）、订阅转换模板（随便选一个）、后面的全部启用

![7-7-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/2452798768.jpg)

9、拉到最下面、应用配置

![8-7-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/4014864891.jpg)

10、Clash提示启动成功

![9-6-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3585872857.jpg)

11、打开控制面板，如果打开控制面板发现不可用，可以点击设置、外部控制设置

![10-6-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/2962458212.jpg)

12、把控制端的IP、端口和密码填填到外部控制设置里面去

![11-5-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3044376541.jpg)

![12-5-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3853490480.jpg)

13、在代理选择香港节点，在奈飞这里选择美国节点，测试一下

![14-5-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/2743490393.jpg)

打开youtube,显示是香港

![15-4-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/5648958.jpg)

打开奈飞，点击电影，可以看到——荣登本日美国电影排行榜，证明是美国的节点，随便打开一个电影都是可以正常播放的，这里就不在演示了。这样就实现了分流的策略。

![16-3-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/244029180.jpg)

14、如果不太喜欢这个策略组的话，可以点击配置文件订阅——修改

![17-4-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1109842208.jpg)

15、换一个订阅转换模板，下拉点击保存配置

![18-2-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1253599112.jpg)

![19-2-2-1-1.jpg](https://inurl.top/usr/uploads/2023/05/3736339556.jpg)

16、然后点击——应用配置，这样就会为我们更新增加相应的策略组。

![20-2-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1641190553.jpg)

![21-2-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1349794565.jpg)

17、在打开控制面板就可以看到策略跟刚刚的不一样了

![22-2-3-1-1.jpg](https://inurl.top/usr/uploads/2023/05/1363289411.jpg)

操作到这里，你基本上就能实现全屋设备都能科学上网了，你可以用手机连家里的wifi，然后上油管或者谷歌搜索一下试试看。

参考阅读：

【[国内如何观看迪士尼Disney+视频？](https://inurl.top/archives/Disney/ "国内如何观看迪士尼Disney+视频？")】

【[如何加入Spotify家庭组会员？](https://inurl.top/archives/spotifyjiatinghuiyuan/ "如何加入Spotify家庭组会员？")】

【[如何观看奈飞Netflix里的视频？](https://inurl.top/archives/lookNetflix/ "如何观看奈飞Netflix里的视频？")】

【[如何加入YouTube Premium家庭组会员？](https://inurl.top/archives/Premium/ "如何加入YouTube Premium家庭组会员？")】

【[5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！](https://inurl.top/archives/shipinvip/ "5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！")】
