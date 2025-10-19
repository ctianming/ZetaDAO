-- 011_social.sql: social follows and posts

-- FOLLOWS
CREATE TABLE IF NOT EXISTS user_follows (
  follower_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  following_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_follow_not_self CHECK (follower_uid <> following_uid),
  UNIQUE(follower_uid, following_uid)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_uid);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_uid);

-- POSTS
CREATE TABLE IF NOT EXISTS user_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_uid);
CREATE INDEX IF NOT EXISTS idx_user_posts_created ON user_posts(created_at DESC);

-- RLS
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
