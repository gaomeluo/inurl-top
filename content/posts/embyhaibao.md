---
title: "NAS上Emby的海报墙搜刮不出来怎么办？【解决方案】"
slug: "embyhaibao"
date: "2023-11-13T15:33:00+08:00"
draft: false
categories: ["yuanquan"]
---

如果你这个看烦了，想看电视直播，可以移步《[安卓电视盒子应用合集（附下载地址）](https://blog.gaomeluo.com/archives/dianshihezi/ "安卓电视盒子应用合集（附下载地址）")》

网上有很多方法可以解决，但是大多数我都测试了，————**还是搜刮不出来。**

其实原因很简单，说到底，就是你的网络不行，你的NAS里需要科学上网，啥都可以解决了。

那么怎么能让你的NAS可以科学上网呢？

————需要在你的NAS里装一个软路由

按照下面的步骤来，你的Emby绝对可以自动刷新出海报墙。

##一、下载固件

目前固件很多，有官方固件，也可以自己编译，还有一些是编译好的固件，KOOLCENTER提供的编译好的固件并直接提供映像（已经安装好的磁盘镜像），有KoolShare以及iStoreOS等，iStoreOS比较新，更新频率较高，而且界面比较美观，建议选择比较新的固件，兼容性会好一些。

地址：https://fw.koolcenter.com/iStoreOS/x86_64/

实际选用固件地址：https://fw.koolcenter.com/iStoreOS/x86_64/istoreos-21.02.3-2022121613-x86-64-squashfs-combined.img.gz

##二、群晖NAS里安装OpenWrt
首先需要安装虚拟机套件，然后在虚拟机套件中安装OpenWrt系统。
###1、安装虚拟机套件
首先要在群晖套件中找到并安装虚拟机套件Virtual Machine Manager，然后打开虚拟机套件

![](https://inurl.top/usr/uploads/2023/11/1613018379.png)

配置存储，如果以前使用过，这里应该已经配置好了

![](https://inurl.top/usr/uploads/2023/11/2099513834.png)

###2、上传固件映像
首先解压刚才下载的OpenWrt固件，得到一个img结尾的文件，可以上传到群晖系统中，也可以先放在本地，在【选择安装文件】中选择映像：

![](https://inurl.top/usr/uploads/2023/11/633036786.png)

把OpenWrt的映像添加进去。

![](https://inurl.top/usr/uploads/2023/11/2258800582.png)

进入下一步并完成。

![](https://inurl.top/usr/uploads/2023/11/111423909.png)

###3、导入虚拟机
点击【虚拟机】，然后【新增】中选择【导入】刚才添加的虚拟机映像

![](https://inurl.top/usr/uploads/2023/11/1079618389.png)

进入下一步，配置下CPU和内存使用等，根据自己的硬件能力配置，据说比较老的固件需要点CPU那个齿轮，配置CPU兼容模式，最新版不需要了。

![](https://inurl.top/usr/uploads/2023/11/2963466115.png)

下一步选择上传的映像

![](https://inurl.top/usr/uploads/2023/11/2065285766.png)

下一步选择网络，默认即可

![](https://inurl.top/usr/uploads/2023/11/1420653077.png)

配置自动启动

![](https://inurl.top/usr/uploads/2023/11/3843318263.png)

选择一个管理用户，然后下一步完成即可，到此为止已经算是安装好了，后面就是要做一些配置了。

![](https://inurl.top/usr/uploads/2023/11/909834870.png)

**注意：**因为是虚拟机，可以拍快照，如果出现一些难以解决的问题可以回滚到快照

##三、配置OpenWrt系统
导入完成之后开机，然后可以连接，进入一个新的网页终端，iStoreOS的系统比较大，启动较慢，可能需要等一等才能进入终端。

![](https://inurl.top/usr/uploads/2023/11/4261349119.png)

回车之后可以进入类似Linux的终端

![](https://inurl.top/usr/uploads/2023/11/571578475.png)

###1、配置IP地址
需要把路由器配置成和主路由同一个网段，默认IP是192.168.100.1，我这里使用的是红米AX6路由器，因此是192.168.31.*网段，可以到路由器中去看看已经使用的网络地址，并选择一个没有使用的IP地址。我这里使用192.168.31.2

    vim /etc/config/network
    
按i键进入编辑模式，找到192.168.100.1修改为192.168.31.2，然后Esc退出编辑模式，然后输入:wq保存（基本vim的操作）

![](https://inurl.top/usr/uploads/2023/11/2633467347.png)

然后重启

    reboot
    

###2、登录OpenWrt
重启完成之后，可以在浏览器访问OpenWrt的后台了，地址：http://192.168.31.2， 密码默认是password。

![](https://inurl.top/usr/uploads/2023/11/2212496662.png)

修改默认密码【系统】-【管理权】：

![](https://inurl.top/usr/uploads/2023/11/2152878764.png)

默认情况下，OpenWrt是由DHCP自动分配IP功能，也就是局域网中由两个DHCP服务器，一般情况作为旁路由都会把旁路由的DHCP功能关闭，目前版本可以自动实现相关配置。

###3、配置旁路由
登录OpenWrt后台之后，进入【网络向导】中有傻瓜式引导功能【配置为旁路由】，当然也可以使用【高级模式】，自己来配置

![](https://inurl.top/usr/uploads/2023/11/3978591179.png)

配置IP地址(192.168.31.2)和网关等，网关设置为主路由的IP地址

![](https://inurl.top/usr/uploads/2023/11/4177936802.png)

配置完成。

###4、测试旁路由
可以用电脑配置一个IP地址测试一下，只要能上网就表示成功了，主要是把网关和DNS指向旁路由的固定IP：192.168.31.2。

![](https://inurl.top/usr/uploads/2023/11/3838740290.png)

##四、安装OpenClash插件

iStoreOS提供的OpenWrt【服务】中已经自带几个插件，如果不需要可以手动关掉。

iStore菜单下可以安装一些常见的插件，比较方便

注意：安装插件有一定风险，虚拟机可以先拍个快照，万一系统崩溃可以快速回退

###1、下载OpenClash
目前要安装OpenClash，最好升级下内核，不然可能会报错

https://downloads.openwrt.org/snapshots/targets/x86/64/packages/

下载最新内核：https://downloads.openwrt.org/snapshots/targets/x86/64/packages/kernel_5.15.86-1-9f9e11a5e946333b83ba37f6864e5c49_x86_64.ipk

下载OpenClash`：

下载地址：https://github.com/vernesong/OpenClash/releases

实际下载文件：https://ghproxy.com/https://github.com/vernesong/OpenClash/releases/download/v0.45.78-beta/luci-app-openclash_0.45.78-beta_all.ipk

###2、上传并安装
先上传到OpenWrt中，在【系统】-【文件传输】中把下载的两个文件都上传到/tmp/upload目录下

![](https://inurl.top/usr/uploads/2023/11/249125985.png)

kernel的ipk可以在界面点安装，不过OpenClash要在安装好依赖之后才能点击安装，可以都在终端用命令安装。

进入终端（默认账号是root/password，如果修改过密码，使用自己修改后的密码），按照OpenClash的文档安装依赖

![](https://inurl.top/usr/uploads/2023/11/3799782239.png)

```
# 升级核心，不升级可能会提示 pkg_hash_check_unresolved: cannot find dependency kernel
opkg install /tmp/upload/kernel_5.15.86-1-9f9e11a5e946333b83ba37f6864e5c49_x86_64.ipk
# 升级
opkg update
# 安装依赖
opkg install coreutils-nohup bash dnsmasq-full curl ca-certificates ipset ip-full libcap libcap-bin ruby ruby-yaml kmod-tun kmod-inet-diag unzip kmod-nft-tproxy luci-compat luci luci-base
# 安装OpenClash
opkg install /tmp/upload/luci-app-openclash_0.45.78-beta_all.ipk
```
安装成功之后，在【服务】中就有【OpenClash】了。

###3、配置OpenClash
在配置文件订阅中，新增自己的订阅地址

![](https://inurl.top/usr/uploads/2023/11/2213974511.png)

订阅地址是你机场的地址，机场我推荐下文的这2个：

####《[魔戒VPN——节点多、速度快、稳定，推荐！！！](https://inurl.top/archives/mojie/ "魔戒VPN——节点多、速度快、稳定，推荐！！！")》

这个机场都能满足你的需求，非常便宜，都是我在用的，还是非常稳定的。购买之后有订阅地址，你直接填进去就可以了。

启动OpenClash之后，可以看到网站访问性检查已经正常了

![](https://inurl.top/usr/uploads/2023/11/2025934906.png)

这时候，你可以在Emby上面，找到没有海报图的电影或者电视剧，然后右键→识别→刷入剧名，可以搜到海报图，说明已经成功了。

####扩展阅读
【[Clash for OpenWRT（软路由）实现全屋设备科学上网](https://inurl.top/archives/ClashforOpenWRT/ "Clash for OpenWRT（软路由）实现全屋设备科学上网")】
【[国内如何观看迪士尼Disney+视频？](https://inurl.top/archives/Disney/ "国内如何观看迪士尼Disney+视频？")】
【[如何加入Spotify家庭组会员？](https://inurl.top/archives/spotifyjiatinghuiyuan/ "如何加入Spotify家庭组会员？")】
【[如何观看奈飞Netflix里的视频？](https://inurl.top/archives/lookNetflix/ "如何观看奈飞Netflix里的视频？")】
【[如何加入YouTube Premium家庭组会员？](https://inurl.top/archives/Premium/ "如何加入YouTube Premium家庭组会员？")】
【[5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！](https://inurl.top/archives/shipinvip/ "5折！爱奇艺、优酷会员、腾讯视频会员、京东Plus会员低至5折优惠购买攻略！")】
