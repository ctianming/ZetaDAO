-- XP System migration
BEGIN;

-- Add xp_total to users if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='xp_total'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_total INT DEFAULT 0;
  END IF;
END $$;

-- Create xp_events table
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkin','publish','view_threshold','tip_give','tip_receive')),
  amount INT NOT NULL CHECK (amount > 0),
  content_id UUID REFERENCES published_content(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  milestone INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  day_utc DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date)
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_type ON xp_events(type);
CREATE INDEX IF NOT EXISTS idx_xp_events_content ON xp_events(content_id);

-- Constraints/uniques
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_xp_checkin_daily'
  ) THEN
    CREATE UNIQUE INDEX uniq_xp_checkin_daily ON xp_events (user_uid, day_utc) WHERE type = 'checkin';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_xp_view_milestone'
  ) THEN
    CREATE UNIQUE INDEX uniq_xp_view_milestone ON xp_events (user_uid, content_id, milestone) WHERE type = 'view_threshold' AND content_id IS NOT NULL AND milestone IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_xp_publish_once'
  ) THEN
    CREATE UNIQUE INDEX uniq_xp_publish_once ON xp_events (user_uid, submission_id) WHERE type = 'publish' AND submission_id IS NOT NULL;
  END IF;
END $$;

-- Trigger function to apply xp to users
CREATE OR REPLACE FUNCTION apply_xp_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET xp_total = COALESCE(xp_total,0) + NEW.amount, updated_at = NOW() WHERE uid = NEW.user_uid;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_apply_xp_event ON xp_events;
CREATE TRIGGER trg_apply_xp_event AFTER INSERT ON xp_events FOR EACH ROW EXECUTE FUNCTION apply_xp_event();

-- RLS
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- Select own XP events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_xp_events') THEN
    CREATE POLICY "select_own_xp_events" ON xp_events FOR SELECT USING (user_uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
  END IF;
END $$;

COMMIT;
