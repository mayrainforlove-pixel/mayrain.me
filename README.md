# MayRain.me · Personal Portal

这是 MayRain 的个人网站项目，已根据提供的个人资料填写主页内容。

## 已填写的个人资料

- 昵称：MayRain
- 账号：@mayrain
- 简介：喜欢游戏、二次元、电脑和各种有趣的小东西。
- 签名：把喜欢的事认真做好。
- X：@MayRainLove_
- Minecraft：Java ID `mayrainlove`；网易版 ID `五玥雨`。Java 版偏好整合包和生存内容，网易版偏好小游戏地图。
- 三角洲行动：昵称 / ID `MayRain丶`；手游萌新，玩过几个赛季，常和朋友一起玩。
- 相册分类：OC 插画、Minecraft 游戏截图、喜欢的风景。
- 内置音乐：保留 `Take Me Hand`。

## 头像与相册

- 已保留原项目的 `assets/images/my-avatar.png`，没有替换头像。
- 相册目前使用项目内原有 PNG 示意图。要换成自己的图片时，分别覆盖 `gallery-01.png`、`gallery-02.png`、`gallery-03.png`，文件名保持不变。
- 点击相册缩略图会打开对应的 PNG 原图。

## 联系方式

主页会显示你提供的公开邮箱 `mayrainlove@163.com`。该邮箱对所有网站访客可见；如果不希望公开，请在 `index.html` 中删除或修改邮箱链接。

## 账号系统与部署

本项目的留言板使用用户名 + 密码账号，支持邮箱找回密码，也允许匿名留言。Worker 使用 D1 保存账号与留言，KV 用于相关临时数据。

部署前请确认 `wrangler.toml` 中的 D1 / KV 绑定与 Cloudflare 控制台一致，并确认 Worker Secrets（例如 `SESSION_SECRET`、`RESEND_API_KEY`）已设置。不要把密钥写入前端或提交到公开仓库。

静态前端部署到 GitHub Pages；Cloudflare Worker 负责 `/api/*` 与 `/auth/*`。前端和 Worker 都部署完成后，再分别测试注册、登录、退出、匿名留言、账号留言和密码找回。
