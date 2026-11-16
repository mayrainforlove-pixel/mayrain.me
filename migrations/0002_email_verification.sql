CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
