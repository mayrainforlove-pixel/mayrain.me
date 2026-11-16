# 部署清单（三个问题的修复版）

上一版线上之所以"看着改了却没用"，是因为三个层面都停在旧版本：前端没重新发布、mp3 没上传、Worker 没重新部署。按顺序做完下面四步才算修好。

## 1. 前端：发布到 GitHub Pages

把本目录除 `worker.js`、`wrangler.toml`、`migrations/`、`DEPLOY.md` 之外的文件推到页面仓库根目录。

**必须确认 `assets/music/take-me-hand.mp3` 真的在仓库里**（4.16 MB）。这是"音乐无法播放"的唯一原因：线上 `https://mayrain.me/assets/music/take-me-hand.mp3` 现在返回 404。

上传后自测：
```
node -e "fetch('https://mayrain.me/assets/music/take-me-hand.mp3',{method:'HEAD'}).then(r=>console.log(r.status,r.headers.get('content-type'),r.headers.get('content-length')))"
```
期望 `200 audio/mpeg 4160913`。页面上点播放按钮，进度会走、时间会变成 0:07 这样。

## 2. 数据库：执行新迁移

```
npx wrangler d1 migrations apply mayrain-accounts --remote
```
会依次执行 0001、0002、**0003_nudges.sql**。0003 做了两件事：建 `nudges` 表（催更，`(user_id, day)` 唯一），给 `email_verifications` 加 `created_at`（60 秒发信冷却）。

注意：`ALTER TABLE ... ADD COLUMN` 只能跑一次，重复执行会报 `duplicate column name`，那是正常的——确认表里已经有这一列就不用管。

## 3. Worker：配置变量并重新部署

```
npx wrangler secret put RESEND_API_KEY   # 没有这个，注册验证码发不出去
npx wrangler secret put SESSION_SECRET   # 随便一串 32 位以上随机字符
npx wrangler deploy
```

`wrangler.toml` 里的 `MAIL_FROM` 必须是在 Resend 里已验证的域名发件人，否则 Resend 返回 403，前端会显示"邮件服务尚未配置"或发信失败。

部署后自测（应返回 `{"total":0,"today":0,"nudged":false}`，而不是 404）：
```
node -e "fetch('https://mayrain.me/api/nudge').then(async r=>console.log(r.status,await r.text()))"
```

## 4. 验收顺序

1. 打开首页 → 日志区只有"催更一下 ↑"和计数，没有"写一篇日志"。
2. 未登录点催更 → 自动展开注册表单。
3. 音乐区只有一个播放按钮和进度条，没有上一首/下一首。
4. 点"登录 / 注册" → 注册页：邮箱、验证码（带"发送验证码"按钮，60 秒倒计时）、密码（至少 10 位）。
5. 用真实邮箱注册 → 收信 → 填 6 位码 → 提交 → 登录成功。
6. 未登录时留言框是禁用的；登录后能发，留言显示账号名。
7. 同一账号当天第二次催更 → 提示"今天已经催过更了，明天再来吧"。

## 本次改了什么

- `worker.js`
  - 修了验证码校验的正则双重转义 bug（原来 `^\d{6}$` 写成了字面量反斜杠，任何 6 位码都判错，注册永远失败）。
  - `/auth/send-code` 改为先发信成功再写库，并加 60 秒冷却（429 + 剩余秒数）；发信失败不会误锁邮箱。
  - 新增 `/api/nudge`：GET 公开返回 `{total,today,nudged}`，POST 需登录、每账号每天一次（409 重复）。
  - 留言列表不再返回 `anonymous` 字段；留言强制登录（`anonymous=0`）。
- `migrations/0003_nudges.sql`：催更表 + 发送时间列。
- `index.html`：删掉的写日志按钮/弹窗本来已不在，这次补上催更 UI；音乐区说明改为单曲不显示切歌；留言板说明改为"未注册不能登录，注册需邮箱+验证码+密码"；注册面板加提示行。
- `js/script.js`：单曲时隐藏上一首/下一首；播放失败时能区分 404/解码失败/自动播放被拦；注册页验证码 60 秒倒计时；催更状态渲染；接口错误翻译成中文（含"Worker 未部署最新版"）。
- `css/style.css`：催更按钮、提示行、倒计时按钮样式与窄屏适配。

## 还剩下的限制

- 音乐只有一首，代码里支持多首，但加歌需要改 `musicList` 并上传文件。
- 日志内容是静态页面里手写的，没有后台发布功能（按你的要求：只有你自己写，访客只能催更/留言）。
- 邮件依赖 Resend 免费额度（100 封/天），超了会返回发信失败。

## 手机端修复（2026-11-16，仅前端）

本轮只改前端 3 个文件，Worker 和数据库不用动：

- `index.html`（css/js 引用加了 `?v=2`）
- `css/style.css`
- `js/script.js`

上传到 GitHub Pages 仓库后，如果手机还看到旧样式，说明 Cloudflare 边缘还缓存着旧文件，按 URL 清一次：

- `https://mayrain.me/index.html`
- `https://mayrain.me/`
