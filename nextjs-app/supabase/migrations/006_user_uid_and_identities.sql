-- Migration: introduce uid primary key and unified identities table
-- Rationale: allow multiple external auth methods (wallet, google, github), clean separation of user profile and auth identities.

BEGIN;

-- 1. Add uid column to users and promote to primary key.
ALTER TABLE users ADD COLUMN IF NOT EXISTS uid UUID;
UPDATE users SET uid = uuid_generate_v4() WHERE uid IS NULL;
-- Temporarily allow both PKs; we'll drop old PK and constraints then set new.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (uid);
-- Keep wallet_address unique (it may be NULL in future for email-only users)
ALTER TABLE users ADD CONSTRAINT users_wallet_address_key UNIQUE (wallet_address);

-- 2. Identities table to map providers/accounts to user uid.
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('wallet','google','github','email')),
  account_id TEXT NOT NULL, -- e.g. wallet address, google sub, github id, email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(provider, account_id),
  UNIQUE(user_uid, provider)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities(user_uid);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider_account ON user_identities(provider, account_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at_user_identities()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_user_identities_updated BEFORE UPDATE ON user_identities
FOR EACH ROW EXECUTE FUNCTION set_updated_at_user_identities();

-- 3. Backfill existing identities from users table (wallet based & email if present)
INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'wallet', wallet_address FROM users WHERE wallet_address IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'email', email FROM users WHERE email IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Add user_uid foreign key columns to related tables; keep legacy wallet fields for now.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE submissions s SET user_uid = u.uid FROM users u WHERE s.wallet_address = u.wallet_address;
ALTER TABLE submissions ADD CONSTRAINT submissions_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_user_uid ON submissions(user_uid);

ALTER TABLE published_content ADD COLUMN IF NOT EXISTS user_uid UUID; -- author
UPDATE published_content pc SET user_uid = u.uid FROM users u WHERE pc.author_wallet = u.wallet_address;
ALTER TABLE published_content ADD CONSTRAINT published_content_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_published_user_uid ON published_content(user_uid);

ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE ambassadors a SET user_uid = u.uid FROM users u WHERE a.wallet_address = u.wallet_address;
ALTER TABLE ambassadors ADD CONSTRAINT ambassadors_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ambassadors_user_uid ON ambassadors(user_uid);

ALTER TABLE likes ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE likes l SET user_uid = u.uid FROM users u WHERE l.wallet_address = u.wallet_address;
ALTER TABLE likes ADD CONSTRAINT likes_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_likes_user_uid ON likes(user_uid);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE comments c SET user_uid = u.uid FROM users u WHERE c.wallet_address = u.wallet_address;
ALTER TABLE comments ADD CONSTRAINT comments_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_user_uid ON comments(user_uid);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE audit_logs al SET user_uid = u.uid FROM users u WHERE al.actor_wallet = u.wallet_address;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_uid ON audit_logs(user_uid);

-- 5. Future cleanup notes (not executed automatically now):
--   * Remove wallet_address columns from tables after code refactor.
--   * Enforce NOT NULL user_uid on new inserts.
--   * Migrate application code to use uid and identities.

COMMIT;
