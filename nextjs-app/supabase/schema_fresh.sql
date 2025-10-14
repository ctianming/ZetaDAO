-- Fresh Schema Build (Consolidated)
-- Use ONLY on a clean environment (data will be lost). Adjust policies to your JWT claims model.
-- Assumptions:
--   * You keep email/password in auth_local_users (current app code expects it)
--   * Primary key for users is uid (UUID)
--   * Other tables reference users via user_uid
--   * Identities stored in user_identities (wallet/google/github/email)
--   * Wallet address kept only on users (optional)

BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== USERS =====================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','ambassador')),
  total_submissions INT DEFAULT 0,
  approved_submissions INT DEFAULT 0,
  twitter TEXT,
  telegram TEXT,
  github TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  email TEXT UNIQUE,
  password_hash TEXT,
  email_verified_at TIMESTAMPTZ,
  verification_code TEXT,
  verification_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_users_email ON users(email);

-- ===================== USER IDENTITIES =====================
DROP TABLE IF EXISTS user_identities CASCADE;
CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('wallet','google','github','email')),
  account_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, account_id),
  UNIQUE(user_uid, provider)
);
CREATE INDEX idx_user_identities_user ON user_identities(user_uid);
CREATE INDEX idx_user_identities_provider_account ON user_identities(provider, account_id);

-- ===================== SUBMISSIONS =====================
DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article','video','activity','ambassador')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  blockchain_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_user_uid ON submissions(user_uid);
CREATE INDEX idx_submissions_category ON submissions(category);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- ===================== PUBLISHED CONTENT =====================
DROP TABLE IF EXISTS published_content CASCADE;
CREATE TABLE published_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  author_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article','video','activity','ambassador')),
  article_category TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  shares INT DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  external_url TEXT,
  image_url TEXT,
  video_url TEXT
);
CREATE INDEX idx_published_category ON published_content(category);
CREATE INDEX idx_published_date ON published_content(published_at DESC);
CREATE INDEX idx_published_author_uid ON published_content(author_uid);
CREATE INDEX idx_published_views ON published_content(views DESC);
CREATE INDEX idx_published_slug ON published_content(slug);
CREATE INDEX idx_published_article_category ON published_content(article_category);
CREATE INDEX idx_published_tags_gin ON published_content USING GIN (tags);

-- ===================== AMBASSADORS =====================
DROP TABLE IF EXISTS ambassadors CASCADE;
CREATE TABLE ambassadors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  bio TEXT,
  avatar TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  twitter TEXT,
  telegram TEXT,
  discord TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contributions INT DEFAULT 0,
  events_hosted INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ambassadors_region ON ambassadors(region);
CREATE INDEX idx_ambassadors_country ON ambassadors(country);
CREATE INDEX idx_ambassadors_status ON ambassadors(status);
CREATE INDEX idx_ambassadors_user_uid ON ambassadors(user_uid);

-- ===================== LIKES =====================
DROP TABLE IF EXISTS likes CASCADE;
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES published_content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_uid, content_id)
);
CREATE INDEX idx_likes_content ON likes(content_id);
CREATE INDEX idx_likes_user_uid ON likes(user_uid);

-- ===================== COMMENTS =====================
DROP TABLE IF EXISTS comments CASCADE;
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES published_content(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible','hidden','deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_comments_content ON comments(content_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_user_uid ON comments(user_uid);

-- ===================== AUDIT LOGS =====================
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  actor_uid UUID NOT NULL REFERENCES users(uid) ON DELETE SET NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_actor_uid ON audit_logs(actor_uid);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ===================== ARTICLE CATEGORIES =====================
DROP TABLE IF EXISTS article_categories CASCADE;
CREATE TABLE article_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_article_categories_name ON article_categories(name);

-- ===================== LOCAL AUTH USERS (legacy password table) =====================
DROP TABLE IF EXISTS auth_local_users CASCADE;
CREATE TABLE auth_local_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  verification_code TEXT,
  verification_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auth_local_users_email ON auth_local_users(email);
CREATE INDEX idx_auth_local_users_username ON auth_local_users(username);

-- ===================== TRIGGERS (updated_at) =====================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_identities_updated BEFORE UPDATE ON user_identities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_published_content_updated BEFORE UPDATE ON published_content FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ambassadors_updated BEFORE UPDATE ON ambassadors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_article_categories_updated BEFORE UPDATE ON article_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_auth_local_users_updated BEFORE UPDATE ON auth_local_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===================== FUNCTIONS (stats) =====================
CREATE OR REPLACE FUNCTION increment_user_submissions(user_uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET total_submissions = COALESCE(total_submissions,0)+1, updated_at = NOW() WHERE uid = user_uid;
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_approved_submissions(user_uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET approved_submissions = COALESCE(approved_submissions,0)+1, updated_at = NOW() WHERE uid = user_uid;
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== ROW LEVEL SECURITY =====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies assume JWT claim 'sub' == users.uid
CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);
CREATE POLICY "update_self_user" ON users FOR UPDATE USING (uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

CREATE POLICY "select_own_or_admin_submissions" ON submissions FOR SELECT USING (
  user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  OR EXISTS (SELECT 1 FROM users WHERE uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid AND role='admin')
);
CREATE POLICY "insert_own_submission" ON submissions FOR INSERT WITH CHECK (
  user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
);

CREATE POLICY "public_read_published" ON published_content FOR SELECT USING (true);
CREATE POLICY "admin_manage_published" ON published_content FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid AND role='admin')
);

CREATE POLICY "public_read_active_ambassadors" ON ambassadors FOR SELECT USING (status='active');

CREATE POLICY "user_manage_own_likes" ON likes FOR ALL USING (user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

CREATE POLICY "public_read_comments" ON comments FOR SELECT USING (status='visible');
CREATE POLICY "user_manage_own_comments" ON comments FOR ALL USING (user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- ===================== SEED =====================
INSERT INTO users (wallet_address, username, role) VALUES
  ('0x0000000000000000000000000000000000000000','Admin','admin'),
  ('0x0000000000000000000000000000000000000001','Alice','user')
ON CONFLICT DO NOTHING;

INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'wallet', wallet_address FROM users WHERE wallet_address IS NOT NULL ON CONFLICT DO NOTHING;

COMMIT;
