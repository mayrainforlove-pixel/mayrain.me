-- 催更：每个登录账号每天最多一次。
CREATE TABLE IF NOT EXISTS nudges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nudges_user_day ON nudges(user_id, day);
CREATE INDEX IF NOT EXISTS idx_nudges_day ON nudges(day);

-- 验证码发送冷却（60 秒）需要的发送时间。
ALTER TABLE email_verifications ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
