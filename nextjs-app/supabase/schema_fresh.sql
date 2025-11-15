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
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','ambassador')),
  xp_total INT DEFAULT 0,
  total_submissions INT DEFAULT 0,
  approved_submissions INT DEFAULT 0,
  twitter TEXT,
  telegram TEXT,
  github TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_users_username ON users(username);

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
  -- legacy compatibility: some code paths still read wallet_address directly
  wallet_address TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article','video','activity','ambassador')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  -- legacy reviewer wallet (optional)
  reviewed_by TEXT,
  blockchain_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_user_uid ON submissions(user_uid);
CREATE INDEX idx_submissions_reviewed_by ON submissions(reviewed_by);
CREATE INDEX idx_submissions_wallet ON submissions(wallet_address);
CREATE INDEX idx_submissions_category ON submissions(category);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- ===================== PUBLISHED CONTENT =====================
DROP TABLE IF EXISTS published_content CASCADE;
CREATE TABLE published_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  author_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  -- legacy compatibility for wallet-centric code paths and seed data
  author_wallet TEXT,
  author_name TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article','video','activity','ambassador')),
  article_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
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
CREATE INDEX idx_published_author_wallet ON published_content(author_wallet);
CREATE INDEX idx_published_views ON published_content(views DESC);
CREATE INDEX idx_published_slug ON published_content(slug);
CREATE INDEX idx_published_article_category ON published_content(article_category);
-- Social: follows and posts
DROP TABLE IF EXISTS user_follows CASCADE;
CREATE TABLE user_follows (
  follower_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  following_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_follow_not_self CHECK (follower_uid <> following_uid),
  UNIQUE(follower_uid, following_uid)
);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_uid);
CREATE INDEX idx_user_follows_following ON user_follows(following_uid);

DROP TABLE IF EXISTS user_posts CASCADE;
CREATE TABLE user_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_user_posts_user ON user_posts(user_uid);
CREATE INDEX idx_user_posts_created ON user_posts(created_at DESC);

-- Basic RLS (reads public, writes by service/API). Adjust as needed.
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_follows' AND policyname = 'user_follows_read_public'
  ) THEN
    CREATE POLICY user_follows_read_public ON user_follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_posts' AND policyname = 'user_posts_read_public'
  ) THEN
    CREATE POLICY user_posts_read_public ON user_posts FOR SELECT USING (true);
  END IF;
END $$;
CREATE INDEX idx_published_tags_gin ON published_content USING GIN (tags);

-- Social interactions: likes and comments on user_posts
DROP TABLE IF EXISTS user_post_likes CASCADE;
CREATE TABLE user_post_likes (
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_uid, post_id)
);
CREATE INDEX idx_user_post_likes_post ON user_post_likes(post_id);
CREATE INDEX idx_user_post_likes_user ON user_post_likes(user_uid);

DROP TABLE IF EXISTS user_post_comments CASCADE;
CREATE TABLE user_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_post_comments_post ON user_post_comments(post_id);
CREATE INDEX idx_user_post_comments_user ON user_post_comments(user_uid);

ALTER TABLE user_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_post_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_post_likes' AND policyname = 'user_post_likes_read_public'
  ) THEN
    CREATE POLICY user_post_likes_read_public ON user_post_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_post_comments' AND policyname = 'user_post_comments_read_public'
  ) THEN
    CREATE POLICY user_post_comments_read_public ON user_post_comments FOR SELECT USING (true);
  END IF;
END $$;

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
  -- allow either uid or wallet to be recorded by various API paths
  actor_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  actor_wallet TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_actor_uid ON audit_logs(actor_uid);
CREATE INDEX idx_audit_logs_actor_wallet ON audit_logs(actor_wallet);
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
  username TEXT,
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

-- ===================== XP (POINTS) SYSTEM =====================
DROP TABLE IF EXISTS xp_events CASCADE;
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkin','publish','view_threshold','tip_give','tip_receive')),
  amount INT NOT NULL CHECK (amount > 0),
  content_id UUID REFERENCES published_content(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  milestone INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 用于“每日”唯一性与统计的 UTC 日期，避免在索引中使用非 IMMUTABLE 表达式
  day_utc DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date)
);
CREATE INDEX idx_xp_events_user_created ON xp_events(user_uid, created_at DESC);
CREATE INDEX idx_xp_events_type ON xp_events(type);
CREATE INDEX idx_xp_events_content ON xp_events(content_id);
-- 唯一：每日签到 1 次
CREATE UNIQUE INDEX uniq_xp_checkin_daily ON xp_events (user_uid, day_utc) WHERE type = 'checkin';
-- 唯一：同一内容的浏览里程碑仅奖励一次
CREATE UNIQUE INDEX uniq_xp_view_milestone ON xp_events (user_uid, content_id, milestone) WHERE type = 'view_threshold' AND content_id IS NOT NULL AND milestone IS NOT NULL;
-- 唯一：同一投稿发布奖励一次
CREATE UNIQUE INDEX uniq_xp_publish_once ON xp_events (user_uid, submission_id) WHERE type = 'publish' AND submission_id IS NOT NULL;

-- 触发器：插入 xp 事件后累加到 users.xp_total
CREATE OR REPLACE FUNCTION apply_xp_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET xp_total = COALESCE(xp_total,0) + NEW.amount, updated_at = NOW() WHERE uid = NEW.user_uid;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_xp_event AFTER INSERT ON xp_events FOR EACH ROW EXECUTE FUNCTION apply_xp_event();

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
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

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
-- XP 事件：用户可读取自己的 XP 记录；禁止直接写入（通过服务端 API 控制）
CREATE POLICY "select_own_xp_events" ON xp_events FOR SELECT USING (user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- ===================== SEED =====================
INSERT INTO users (wallet_address, username, role) VALUES
  ('0x0000000000000000000000000000000000000000','Admin','admin'),
  ('0x0000000000000000000000000000000000000001','Alice','user')
ON CONFLICT DO NOTHING;

INSERT INTO user_identities (user_uid, provider, account_id)
SELECT uid, 'wallet', wallet_address FROM users WHERE wallet_address IS NOT NULL ON CONFLICT DO NOTHING;

-- ===================== SHOP (PRODUCTS / ORDERS / ADDRESSES) =====================

DROP TABLE IF EXISTS shop_contract_admins CASCADE;
CREATE TABLE shop_contract_admins (
  address TEXT PRIMARY KEY,
  user_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  added_by UUID REFERENCES users(uid) ON DELETE SET NULL,
  added_tx_hash TEXT,
  revoked_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shop_contract_admins_active ON shop_contract_admins(active);
CREATE TRIGGER trg_shop_contract_admins_updated BEFORE UPDATE ON shop_contract_admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TABLE IF EXISTS shop_products CASCADE;
CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onchain_id NUMERIC(78,0),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  metadata_uri TEXT,
  price_wei NUMERIC(78,0) NOT NULL CHECK (price_wei >= 0),
  stock BIGINT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive')),
  last_synced_block NUMERIC(78,0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (onchain_id)
);
CREATE INDEX idx_shop_products_status ON shop_products(status);
CREATE TRIGGER trg_shop_products_updated BEFORE UPDATE ON shop_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TABLE IF EXISTS shop_orders CASCADE;
CREATE TABLE shop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onchain_id NUMERIC(78,0),
  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
  product_onchain_id NUMERIC(78,0),
  buyer_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
  buyer_address TEXT,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  unit_price_wei NUMERIC(78,0) NOT NULL CHECK (unit_price_wei >= 0),
  total_price_wei NUMERIC(78,0) NOT NULL CHECK (total_price_wei >= 0),
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created','paid','shipped','completed','cancelled','refunded')
  ),
  metadata_hash TEXT,
  last_status_note TEXT,
  chain_id INTEGER,
  last_event_tx_hash TEXT,
  paid_tx_hash TEXT,
  refund_tx_hash TEXT,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  shipping_contact TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  offchain_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (onchain_id)
);
CREATE INDEX idx_shop_orders_buyer_uid ON shop_orders(buyer_uid);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_product_onchain_id ON shop_orders(product_onchain_id);
CREATE TRIGGER trg_shop_orders_updated BEFORE UPDATE ON shop_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TABLE IF EXISTS shop_addresses CASCADE;
CREATE TABLE shop_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shop_addresses_user ON shop_addresses(user_uid);
CREATE TRIGGER trg_shop_addresses_updated BEFORE UPDATE ON shop_addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (Optional) RLS for shop tables can be enabled depending on app model
-- ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shop_addresses ENABLE ROW LEVEL SECURITY;

COMMIT;
