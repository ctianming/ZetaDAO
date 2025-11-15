-- Migration: Add homepage_banners table
-- This script can be safely run on an existing database.

BEGIN;

-- Create the homepage_banners table if it doesn't exist
CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'scheduled')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_homepage_banners_status_times ON homepage_banners(status, start_at, end_at);

-- Add the updated_at trigger
-- The function set_updated_at() should already exist from the initial schema
DROP TRIGGER IF EXISTS trg_homepage_banners_updated ON homepage_banners;
CREATE TRIGGER trg_homepage_banners_updated 
BEFORE UPDATE ON homepage_banners 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Policy for public read access to active banners
DROP POLICY IF EXISTS "public_read_active_banners" ON homepage_banners;
CREATE POLICY "public_read_active_banners" ON homepage_banners 
FOR SELECT USING (
  status = 'active' AND 
  (start_at IS NULL OR start_at <= NOW()) AND 
  (end_at IS NULL OR end_at >= NOW())
);

-- Policy for admin management
DROP POLICY IF EXISTS "admin_manage_banners" ON homepage_banners;
CREATE POLICY "admin_manage_banners" ON homepage_banners 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE uid = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid 
    AND role='admin'
  )
);

COMMIT;
