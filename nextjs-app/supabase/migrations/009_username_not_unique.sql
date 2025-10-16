-- Drop username uniqueness on users table; keep a non-unique index for lookups
DO $$
DECLARE
  has_unique boolean;
BEGIN
  -- Drop UNIQUE constraint if defined directly on column (older schemas)
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
  EXCEPTION WHEN undefined_column THEN
    -- ignore
  END;

  -- Drop functional unique index if exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='users_username_unique_ci'
  ) INTO has_unique;
  IF has_unique THEN
    EXECUTE 'DROP INDEX IF EXISTS users_username_unique_ci';
  END IF;

  -- Ensure a non-unique btree index exists for performance
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)';
END$$;
