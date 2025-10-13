# ZetaDAO Community Portal - Next.js版本

基于 Next.js 14 构建的 ZetaDAO 社区门户网站，支持投稿系统和管理员审核功能。

## ✨ 特性

- 🎨 **现代化 UI**: 使用 Tailwind CSS + shadcn/ui 构建精美界面
- 🔗 **Web3 集成**: 通过 RainbowKit + wagmi 支持钱包连接
- 📝 **投稿系统**: 用户可提交文章、视频、活动内容
- 👑 **管理员审核**: Admin可审核并发布投稿内容
- 🗄️ **混合存储**: Supabase 存储数据 + ZetaChain 链上记录
- 📱 **响应式设计**: 完美支持移动端和桌面端
- ⚡ **高性能**: Next.js 14 App Router + Server Components

## 🏗️ 技术栈

```
├── Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── shadcn/ui
├── wagmi + viem (Web3)
├── RainbowKit (钱包连接)
├── Supabase (数据库)
├── Framer Motion (动画)
└── React Query (数据获取)
```

## 📦 安装

### 1. 克隆仓库并安装依赖

```bash
cd nextjs-app
npm install
# 或
yarn install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填写配置：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
# App配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin钱包地址（逗号分隔）
ADMIN_WALLETS=0x1234...,0x5678...

# ZetaChain配置
NEXT_PUBLIC_ZETA_CHAIN_ID=7001
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
```

### 3. 设置 Supabase 数据库

登录 [Supabase](https://supabase.com/) 并创建新项目，然后执行以下 SQL：

```sql
-- 创建投稿表
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('article', 'video', 'activity')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,
    blockchain_hash TEXT,
    metadata JSONB
);

-- 创建用户表
CREATE TABLE users (
    wallet_address TEXT PRIMARY KEY,
    username TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT NOW(),
    total_submissions INT DEFAULT 0,
    approved_submissions INT DEFAULT 0
);

-- 创建已发布内容表
CREATE TABLE published_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    author_wallet TEXT,
    author_name TEXT,
    published_at TIMESTAMP DEFAULT NOW(),
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    metadata JSONB
);

-- 创建索引
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_wallet ON submissions(wallet_address);
CREATE INDEX idx_published_category ON published_content(category);
CREATE INDEX idx_published_date ON published_content(published_at DESC);

-- 启用行级安全 (RLS)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读已发布内容
CREATE POLICY "公开读取已发布内容" ON published_content
    FOR SELECT USING (true);

-- RLS 策略：用户只能读取自己的投稿
CREATE POLICY "用户读取自己的投稿" ON submissions
    FOR SELECT USING (auth.uid()::TEXT = wallet_address);

-- RLS 策略：用户可以创建投稿
CREATE POLICY "用户创建投稿" ON submissions
    FOR INSERT WITH CHECK (true);
```

### 4. 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📂 项目结构

```
nextjs-app/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页
│   ├── providers.tsx       # 全局Provider
│   ├── articles/           # 文章页面
│   ├── videos/             # 视频页面
│   ├── activities/         # 活动页面
│   ├── ambassadors/        # 大使页面
│   ├── submit/             # 投稿页面
│   ├── admin/              # 管理员面板
│   └── api/                # API路由
│       ├── submit/         # 投稿API
│       ├── approve/        # 审核API
│       └── content/        # 内容API
├── components/             # React组件
│   ├── layout/             # 布局组件
│   ├── home/               # 首页组件
│   ├── content/            # 内容组件
│   └── ui/                 # UI组件 (shadcn)
├── lib/                    # 工具库
│   ├── db.ts               # Supabase客户端
│   ├── auth.ts             # 认证逻辑
│   ├── utils.ts            # 工具函数
│   └── blockchain.ts       # 区块链交互
├── hooks/                  # React Hooks
├── types/                  # TypeScript类型
└── public/                 # 静态资源
```

## 🚀 功能说明

### 用户功能

1. **浏览内容**: 查看文章、视频、活动、大使名录
2. **连接钱包**: 使用 MetaMask 等钱包登录
3. **投稿**: 提交文章、视频或活动内容
4. **查看投稿状态**: 跟踪自己的投稿审核状态

### 管理员功能

1. **审核投稿**: 查看待审核的投稿列表
2. **批准/拒绝**: 审核并发布或拒绝投稿
3. **链上记录**: 审核通过后可选择记录到区块链
4. **内容管理**: 编辑或删除已发布内容

## 📝 使用指南

### 投稿流程

1. 连接钱包
2. 进入"投稿"页面
3. 选择投稿类型（文章/视频/活动）
4. 填写标题、内容等信息
5. 提交投稿
6. 等待管理员审核

### 审核流程 (Admin)

1. 以管理员钱包地址登录
2. 进入"管理员面板"
3. 查看待审核投稿列表
4. 点击"批准"或"拒绝"
5. 批准的内容自动发布到对应页面

## 🔧 开发建议

### 添加新内容类型

1. 在 `types/index.ts` 中添加新类型
2. 更新数据库表结构
3. 创建对应的页面和组件
4. 添加API路由处理逻辑

### 自定义样式

- 修改 `tailwind.config.ts` 调整颜色主题
- 编辑 `app/globals.css` 添加全局样式
- 使用 shadcn/ui 组件系统保持一致性

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

记得在 Vercel 项目设置中配置环境变量！

## 🔐 安全注意事项

- ✅ 所有 Admin 操作都需要验证钱包地址
- ✅ 使用 Supabase RLS (Row Level Security)
- ✅ API 路由实现 Rate Limiting
- ✅ 内容提交前进行 XSS 过滤
- ✅ 敏感配置使用环境变量

## 📚 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [wagmi](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Supabase](https://supabase.com/docs)
- [ZetaChain Docs](https://www.zetachain.com/docs)

## 🤝 贡献

欢迎提交 PR 和 Issue！

## 📄 License

MIT
