-- Likes and comments for user_posts
BEGIN;
CREATE TABLE IF NOT EXISTS user_post_likes (
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_uid, post_id)
);
CREATE INDEX IF NOT EXISTS idx_user_post_likes_post ON user_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_user_post_likes_user ON user_post_likes(user_uid);

CREATE TABLE IF NOT EXISTS user_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_post_comments_post ON user_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_post_comments_user ON user_post_comments(user_uid);

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
COMMIT;
