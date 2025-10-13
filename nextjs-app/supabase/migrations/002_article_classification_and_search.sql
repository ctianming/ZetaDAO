-- Add article classification and improve tag search

ALTER TABLE published_content
  ADD COLUMN IF NOT EXISTS article_category TEXT;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_published_article_category ON published_content(article_category);
-- GIN index for array overlap queries on tags
CREATE INDEX IF NOT EXISTS idx_published_tags_gin ON published_content USING GIN (tags);
