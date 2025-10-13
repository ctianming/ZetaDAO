-- ZetaDAO Portal Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for ZetaDAO community portal

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 投稿表 (Submissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('article', 'video', 'activity', 'ambassador')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    blockchain_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 用户表 (Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    wallet_address TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'ambassador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_submissions INT DEFAULT 0,
    approved_submissions INT DEFAULT 0,
    
    -- 社交链接
    twitter TEXT,
    telegram TEXT,
    github TEXT,
    
    -- 额外信息
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- 已发布内容表 (Published Content)
-- =====================================================
CREATE TABLE IF NOT EXISTS published_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('article', 'video', 'activity', 'ambassador')),
    author_wallet TEXT,
    author_name TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 互动数据
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    
    -- SEO
    slug TEXT UNIQUE,
    tags TEXT[] DEFAULT '{}',
    
    -- 元数据
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 外部链接
    external_url TEXT,
    image_url TEXT,
    video_url TEXT
);

-- =====================================================
-- 大使表 (Ambassadors)
-- =====================================================
CREATE TABLE IF NOT EXISTS ambassadors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE REFERENCES users(wallet_address) ON DELETE CASCADE,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    bio TEXT,
    avatar TEXT,
    
    -- 地理位置（用于地图展示）
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- 社交链接
    twitter TEXT,
    telegram TEXT,
    discord TEXT,
    
    -- 统计
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contributions INT DEFAULT 0,
    events_hosted INT DEFAULT 0,
    
    -- 状态
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    
    -- 元数据
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 点赞表 (Likes)
-- =====================================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    content_id UUID REFERENCES published_content(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 防止重复点赞
    UNIQUE(wallet_address, content_id)
);

-- =====================================================
-- 评论表 (Comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    content_id UUID REFERENCES published_content(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 状态
    status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted'))
);

-- =====================================================
-- 审计日志表 (Audit Logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    actor_wallet TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 索引 (Indexes)
-- =====================================================

-- Submissions 索引
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_wallet ON submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

-- Published Content 索引
CREATE INDEX IF NOT EXISTS idx_published_category ON published_content(category);
CREATE INDEX IF NOT EXISTS idx_published_date ON published_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_author ON published_content(author_wallet);
CREATE INDEX IF NOT EXISTS idx_published_views ON published_content(views DESC);
CREATE INDEX IF NOT EXISTS idx_published_slug ON published_content(slug);

-- Users 索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- Ambassadors 索引
CREATE INDEX IF NOT EXISTS idx_ambassadors_region ON ambassadors(region);
CREATE INDEX IF NOT EXISTS idx_ambassadors_country ON ambassadors(country);
CREATE INDEX IF NOT EXISTS idx_ambassadors_status ON ambassadors(status);

-- Likes 索引
CREATE INDEX IF NOT EXISTS idx_likes_content ON likes(content_id);
CREATE INDEX IF NOT EXISTS idx_likes_wallet ON likes(wallet_address);

-- Comments 索引
CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- =====================================================
-- 触发器函数 (Trigger Functions)
-- =====================================================

-- 更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有需要的表创建触发器
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_published_content_updated_at BEFORE UPDATE ON published_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ambassadors_updated_at BEFORE UPDATE ON ambassadors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 行级安全策略 (Row Level Security)
-- =====================================================

-- 启用 RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Published Content: 所有人可读
CREATE POLICY "公开读取已发布内容" ON published_content
    FOR SELECT USING (true);

-- Published Content: 只有管理员可以插入、更新、删除
CREATE POLICY "管理员管理内容" ON published_content
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
            AND users.role = 'admin'
        )
    );

-- Submissions: 用户可以读取自己的投稿
CREATE POLICY "用户读取自己的投稿" ON submissions
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
            AND users.role = 'admin'
        )
    );

-- Submissions: 用户可以创建投稿
CREATE POLICY "用户创建投稿" ON submissions
    FOR INSERT WITH CHECK (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Users: 所有人可读，用户可更新自己的信息
CREATE POLICY "公开读取用户信息" ON users
    FOR SELECT USING (true);

CREATE POLICY "用户更新自己的信息" ON users
    FOR UPDATE USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Ambassadors: 所有人可读
CREATE POLICY "公开读取大使信息" ON ambassadors
    FOR SELECT USING (status = 'active');

-- Likes: 用户可以点赞和取消点赞
CREATE POLICY "用户管理自己的点赞" ON likes
    FOR ALL USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Comments: 所有人可读，用户可管理自己的评论
CREATE POLICY "公开读取评论" ON comments
    FOR SELECT USING (status = 'visible');

CREATE POLICY "用户管理自己的评论" ON comments
    FOR ALL USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- =====================================================
-- 实用函数 (Utility Functions)
-- =====================================================

-- 增加用户投稿计数
CREATE OR REPLACE FUNCTION increment_user_submissions(user_wallet TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET total_submissions = COALESCE(total_submissions, 0) + 1,
            updated_at = NOW()
    WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加用户审核通过计数
CREATE OR REPLACE FUNCTION increment_approved_submissions(user_wallet TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET approved_submissions = COALESCE(approved_submissions, 0) + 1,
            updated_at = NOW()
    WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 初始数据 (Seed Data)
-- =====================================================

-- 插入示例管理员用户（需要替换为实际地址）
INSERT INTO users (wallet_address, username, role) VALUES
    ('0x0000000000000000000000000000000000000000', 'Admin', 'admin')
ON CONFLICT (wallet_address) DO NOTHING;

-- 完成
COMMENT ON TABLE submissions IS '用户投稿表';
COMMENT ON TABLE users IS '用户信息表';
COMMENT ON TABLE published_content IS '已发布内容表';
COMMENT ON TABLE ambassadors IS '社区大使表';
COMMENT ON TABLE likes IS '点赞记录表';
COMMENT ON TABLE comments IS '评论表';
COMMENT ON TABLE audit_logs IS '审计日志表';
