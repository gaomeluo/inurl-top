---
title: 无标题
date: 2026-08-10
---

虽然很多厂子都有免费Token，但是都有额度的，不可能无限量的供应，要么每日限、每月限、要么是注册赠送多少。

而真正用他的客户，总是会觉得他不够用。

![](https://img.inurl.link/i/bde4a20f-f06b-4b7b-baaf-cdeb56a8f770)

怎么办？

一个一个的去粘贴、复制他们的key？

你有没有算过，自己到底在多少个 AI 智能体里填过 Key？

怎么才能统一、有效的去管理他们？

今天给大家推荐一个平台，**聚合 APIToken（inurl.link）。**一个统一Token令牌，通吃所有 OpenAI 兼容客户端。全程图形界面，不用敲命令，跟着点就行。

放心、绝对安全，你所有key只存于本机，你是存在他的平台上的。工作原理如下：

![](https://img.inurl.link/i/81eef75c-95c0-4fad-93b8-3321309708b4)

### 官方网址：[https://token.inurl.link/](https://inurl.link/apitoken "https://token.inurl.link/")

下面就教大家如何使用它。
## 一、准备工作

• 一个邮箱（注册用）

• 你各家厂商的 API Key（通义千问、DeepSeek、OpenAI 等等）

既然是免费，那就要有免费的样子，他把目前免费的token做了一个集合页，你挨个注册就行了。

#### 传送门：[https://token.inurl.link/models](https://token.inurl.link/models#free "https://token.inurl.link/models")

![](https://img.inurl.link/i/f4a61d22-ab20-4a40-a940-d1f21c0a0e93)

如上图，这些都是非常优质的免费的token。

• 本机装 Node.js 18 或以上（没有去 [nodejs.org](https://nodejs.org/ "nodejs.org") 下载，下一步下一步装好）

## 二、注册聚合API Token

打开 https://token.inurl.link/app ，点「创建账户」，填邮箱 + 密码，过一下人机验证。

![](https://img.inurl.link/i/ba8a01d8-91f8-475f-af24-7e1803ceccd9)

注册成功，页面会显示两样东西，务必立刻复制保存：

**统一令牌（Unified Token）**：登录 + 启动代理的凭证

**恢复密语（Recovery Secret）**：忘密码时找回密钥库用

> 这两串只在此时显示一次，官方也明说“无法帮你找回”（端到端加密，云端没存明文）。存到只有你知道的地方，比如密码管理器。

## 三、把各家免费的Key做成统一的key

进「厂商密钥库」页面，把你各家厂商的 API Key 填进去。这里只存密文。

![](https://img.inurl.link/i/394db7aa-3632-446f-a46b-b8084ff3d995)

• **内置厂商**：列表里预置了通义千问、智谱、Kimi、豆包、MiniMax、OpenAI、DeepSeek、Groq、OpenRouter 等，选厂商即可，接口地址自动填好。

这个平台还把目前免费好用的Token都汇集了，你只需按图注册即可。

#### 传送门：[https://token.inurl.link/models](https://token.inurl.link/models#free "https://token.inurl.link/models")

![](https://img.inurl.link/i/f4a61d22-ab20-4a40-a940-d1f21c0a0e93)

• **自定义厂商**：没有的，点「添加自定义厂商」，填名称 + 接口地址 + 模型名 + 你自己的 Key，会合并进目录。

![](https://img.inurl.link/i/8eef0274-57ce-4df7-96c7-c0e4065218a0)

这一步做完，你在各厂子注册免费的 Key，全收在一个地方了。

## 四、一键启动本地代理（不用命令行！）

在「密钥库」页面底部，点 「一键启动本地代理」，网页会下载一个小启动器：

![](https://img.inurl.link/i/3098eb48-2e67-4298-92b4-8a06d97d1c78)

• Windows 是 byok-launch.bat

• macOS / Linux 是 byok-launch.sh

双击这个文件就能运行（前提本机有 Node.js 18+）。网页会自动检测到 「本地代理已连接 ✓」。

![](https://img.inurl.link/i/a47d1724-9112-43b7-a6c1-f85022c8c513)

代理地址固定是 `http://localhost:3003/v1` 。它跑在你电脑上，负责用你的 Key 直连厂商——Key 不出本机，云端只存密文。

做完这一项可以在下面进行测试一下，如图：

![](https://img.inurl.link/i/d7c6b243-adf6-40cf-8558-6c66899ff3f7)

如上图，他能回复你，说明你这一个token令牌已经成功了。

## 五、统一令牌key，所有的AI智能体通吃（重点！）
“通吃”的真相就在这：你只在每个客户端填 3 个一样的值：

|  填什么 |  值 |
| ------------ | ------------ |
|  API 地址 / Base URL |  `http://localhost:3003/v1` |
|  API Key |  你的统一令牌 |
|  模型 Model |  模型 id 或 inurl |

举个例子：

在 WorkBuddy 里：设置 → 自定义 / 兼容端点，填上面 3 个，选模型。

![](https://img.inurl.link/i/b9dc86ff-a80c-408e-befc-695737ebe3f5)

## 六、接入 inurl 模型，让 AI智能体 自己换厂商

Model 直接填 inurl，代理自动挑一个有健康 Key 的厂商；某家挂了（5xx/429）自动切下一家。

• 写代码填 inurl-code，自动选代码模型

• 画图填 inurl-image，自动选图像模型

• 视频 inurl-video、语音 inurl-audio 同理

![](https://img.inurl.link/i/b4dbb22f-45a1-4469-825b-c2ad19a2c5e2)

如上图，在右下角选择自己创建的模型，对话框里输入问题，它能正常回复你，说明你已成功上车了。

###常见问题
• 报“无法连通”？ 查三处：模型 id 一字不差 / Base URL 是 `http://localhost:3003/v1` / 对应厂商 Key 已添加。

• 每次开机要启动代理？ 双击启动器即可，也可配开机自启。

• 安全吗？ 云端只存密文，Key 从你电脑直连厂商，官方也看不到明文。

怎么样？赶紧上车吧！
###传送门：[https://token.inurl.link/](https://inurl.link/apitoken "https://token.inurl.link/")