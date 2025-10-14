-- Full Rebuild Migration: establish uid as primary key and consolidated schema
-- WARNING: This script DROPs and recreates dependent constraints. Use ONLY in pre-production.
-- Steps:
-- 1. Add uid column if missing.
-- 2. Create new PK on uid (CASCADE to drop dependent foreign keys then re-add them).
-- 3. Create user_identities table.
-- 4. Recreate foreign keys referencing users(uid).
-- 5. Backfill identities.

BEGIN;

-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add uid column
ALTER TABLE users ADD COLUMN IF NOT EXISTS uid UUID;
UPDATE users SET uid = uuid_generate_v4() WHERE uid IS NULL;

-- 2. Switch primary key (drop old PK with CASCADE then add new PK).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (uid);
-- Keep unique wallet constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_key;
ALTER TABLE users ADD CONSTRAINT users_wallet_address_key UNIQUE (wallet_address);

-- 3. Create identities table
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('wallet','google','github','email')),
  account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(provider, account_id),
  UNIQUE(user_uid, provider)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities(user_uid);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider_account ON user_identities(provider, account_id);

CREATE OR REPLACE FUNCTION set_updated_at_user_identities()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_user_identities_updated BEFORE UPDATE ON user_identities
FOR EACH ROW EXECUTE FUNCTION set_updated_at_user_identities();

-- 4. Add user_uid columns & recreate foreign keys on related tables (if not exists)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE submissions s SET user_uid = u.uid FROM users u WHERE s.wallet_address = u.wallet_address;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_uid_fk;
ALTER TABLE submissions ADD CONSTRAINT submissions_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_user_uid ON submissions(user_uid);

ALTER TABLE published_content ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE published_content pc SET user_uid = u.uid FROM users u WHERE pc.author_wallet = u.wallet_address;
ALTER TABLE published_content DROP CONSTRAINT IF EXISTS published_content_user_uid_fk;
ALTER TABLE published_content ADD CONSTRAINT published_content_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_published_user_uid ON published_content(user_uid);

ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE ambassadors a SET user_uid = u.uid FROM users u WHERE a.wallet_address = u.wallet_address;
ALTER TABLE ambassadors DROP CONSTRAINT IF EXISTS ambassadors_user_uid_fk;
ALTER TABLE ambassadors ADD CONSTRAINT ambassadors_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ambassadors_user_uid ON ambassadors(user_uid);

ALTER TABLE likes ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE likes l SET user_uid = u.uid FROM users u WHERE l.wallet_address = u.wallet_address;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_uid_fk;
ALTER TABLE likes ADD CONSTRAINT likes_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_likes_user_uid ON likes(user_uid);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE comments c SET user_uid = u.uid FROM users u WHERE c.wallet_address = u.wallet_address;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_uid_fk;
ALTER TABLE comments ADD CONSTRAINT comments_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_user_uid ON comments(user_uid);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_uid UUID;
UPDATE audit_logs al SET user_uid = u.uid FROM users u WHERE al.actor_wallet = u.wallet_address;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_uid_fk;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_uid_fk FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_uid ON audit_logs(user_uid);

-- 5. Backfill identities (wallet + email)
INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'wallet', wallet_address FROM users WHERE wallet_address IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'email', email FROM users WHERE email IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
