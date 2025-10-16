-- Enforce username uniqueness on users table (case-insensitive)
-- Note: This creates a functional unique index on lower(username).
-- If duplicates already exist, this migration will fail and requires manual cleanup.

DO $$
BEGIN
  -- Create a unique index on lower(username) to enforce case-insensitive uniqueness
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_username_unique_ci'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX users_username_unique_ci ON users ((lower(username)))';
  END IF;
END$$;

-- Also add a simple btree index on username for lookups (non-unique) if helpful
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
