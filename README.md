# MayRain Personal Website

一个使用原生 HTML、CSS、JavaScript 构建的日系二次元风格个人网站。

## 本地运行
1. 解压项目文件。
2. 用 VS Code 打开项目文件夹。
3. 使用 VS Code 的 Live Server 扩展打开 `index.html`；也可以直接在浏览器中打开 `index.html`。

## 目录
- `index.html`：页面结构
- `css/style.css`：视觉样式、响应式布局、主题
- `js/script.js`：主题切换、音乐播放器、日志、留言板、图片灯箱
- `assets/images/`：头像与示例插画素材

## 个性化修改
- 个人介绍：编辑 `index.html` 的 ABOUT 区域。
- 联系方式：替换 CONTACT 区域的 X 账号和示例邮箱。
- 图片：将自己的图片放入 `assets/images/`，并修改 HTML 对应路径。
- 音乐：页面音乐播放器允许访客选择本地音频文件；不会自动播放或上传音频。
- 日志和留言：当前使用浏览器 `localStorage` 保存，只在当前浏览器/设备可见。若要多人共享，需要后端服务和数据库。

## 部署
可部署到 GitHub Pages、Netlify 或 Cloudflare Pages 等静态网站托管服务。上传整个项目目录，确保 `index.html` 位于发布目录根部。

## 注意
本项目不包含服务端、账号系统、云端留言或云端博客管理功能。不要把密码、API 密钥等秘密写进前端文件。