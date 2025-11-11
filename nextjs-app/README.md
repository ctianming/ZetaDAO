# ZetaDAO Community Portal - Next.js版本

基于 Next.js 14 构建的 ZetaDAO 社区门户网站，支持投稿系统和管理员审核功能。

> 重要更新（安全与链上体验）
> 
> - 登录已与“钱包连接”彻底解耦：登录使用账号体系（next-auth），链上操作单独通过钱包完成。
> - 管理员鉴权采用“签名挑战 + httpOnly 会话 Cookie（admin_session）”：前端请求 `/api/auth/admin/challenge` → 使用钱包签名 → `/api/auth/admin/verify` 校验并颁发会话；后续所有 Admin API 仅依赖会话与服务端白名单 `ADMIN_WALLETS`，不再接受自定义请求头或查询参数。
> - 全站统一使用 ZetaChain（可配置主网/测试网），在发起任意链上操作前会提示并尝试切换到目标网络。
> - 钱包体验优化：支持 MetaMask、OKX（注入钱包）与 WalletConnect（需配置 projectId）。

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
NEXT_PUBLIC_ZETA_CHAIN_ID=7001                           # 7001 测试网 Athens，7000 主网
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
NEXT_PUBLIC_ZETA_EXPLORER_BASE=https://athens.explorer.zetachain.com  # 可选，默认使用 wagmi 内置配置

# RainbowKit / WalletConnect（用于移动钱包扫码连接）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-wc-project-id

# 腾讯云SES（用于邮箱验证码）
# 在腾讯云控制台创建并审核通过邮件模板，记录模板ID
TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key
TENCENT_SES_REGION=ap-hongkong
# 必须是已验证的发信地址（或同域名下地址）
TENCENT_SES_FROM=noreply@yourdomain.com
TENCENT_SES_TEMPLATE_ID=12345

# --- 自动刷新（前端轮询）配置 ---
# 是否启用全局自动刷新（false 可彻底关闭依赖此配置的页面轮询）
NEXT_PUBLIC_AUTO_REFRESH_ENABLED=true
# 轮询间隔（毫秒），建议在生产环境根据流量与实时性权衡（如 15000 = 15s）
NEXT_PUBLIC_SWR_REFRESH_MS=15000
# 聚焦窗口时是否重新验证（SWR 页）
NEXT_PUBLIC_SWR_REVALIDATE_ON_FOCUS=true
# 网络重新连通时是否重新验证（SWR 页）
NEXT_PUBLIC_SWR_REVALIDATE_ON_RECONNECT=true
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

### 用户功能（登录与钱包解耦）

1. **浏览内容**: 查看文章、视频、活动、大使名录
2. **连接钱包**: 仅用于链上操作（非登录），在 Header 中点击“连接钱包”并完成签名后，后台会设置 httpOnly Cookie 以识别管理员
3. **投稿**: 提交文章、视频或活动内容
4. **查看投稿状态**: 跟踪自己的投稿审核状态

### 管理员功能（Cookie 鉴权）

1. **审核投稿**: 查看待审核的投稿列表（需先在 Header 连接管理员钱包并签名）
2. **批准/拒绝**: 审核并发布或拒绝投稿
3. **链上记录**: 发起链上写入前会自动校验并提示切换到配置的 ZetaChain 网络
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

## 🔗 链路与网络（要点）

- 单一链配置：在 `lib/web3.ts` 集中维护 ZetaChain 网络（主网/测试网），前后端统一读取。
- 客户端网络强制：在 Header、商店购买页、管理员商店页等发起链上交易前强制提示并尝试切换网络。
- 管理员鉴权：服务端通过 `isAdminFromSession` + 白名单校验，来源为 httpOnly Cookie `admin_session`（由挑战签名流程颁发）。
- Explorer 链接：自动根据当前配置指向对应链的浏览器（可通过 `NEXT_PUBLIC_ZETA_EXPLORER_BASE` 覆盖）。

## 🛍️ 商店管理（Shop）

商店管理入口位于：`/admin` → 卡片“商店管理” → `/admin/shop`

### 功能概览

- 商品管理：创建、编辑、删除、上下架（`status: active/inactive`），价格以 `wei` 存储（`price_wei`）。
- 订单管理：查看订单列表、导出 CSV、链上状态操作（发货/完成/取消/退款）。
- 合约联动：在执行链上写入前，会强制校验并引导切换至配置的 ZetaChain 网络。

### 关键环境变量

- `NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS`：商店合约地址（用于管理员链上操作）。
- `NEXT_PUBLIC_SHOP_CHAIN_ID`（可选）：优先用于商店链 ID；未配置时回退至 `NEXT_PUBLIC_ZETA_CHAIN_ID`。

### 商品字段（数据库 `shop_products`）

- `slug`（唯一）、`name`、`description`、`image_url`
- `price_wei`（整型字符串）、`stock`（库存）
- `status`（`active`/`inactive`）
- `metadata_uri`（商品元数据地址，指向站内代理 URL）
- `onchain_id`（链上商品 ID，可选）

### 元数据自动生成

- API：`POST /api/shop/products/metadata`
    - 请求体：`{ id?: string; slug?: string; attributes?: Record<string,string|number>; force?: boolean }`
    - 行为：根据商品字段构造标准 JSON 元数据，写入 Supabase Storage，并将可访问的代理 URL 回写到 `metadata_uri`。
    - 返回：`{ success, metadata_uri, path, metadata }`
- 访问：为兼容私有存储桶，所有资源通过站内代理 `GET /api/storage/file?path=...` 提供访问链接。
- 管理页面：
    - 商品列表中提供“生成/重新生成”按钮。
    - 商品表单提供 `metadata_uri` 输入框与“自动生成”按钮。

### 管理端鉴权约定

- 所有管理员 API 与导出/状态更新操作，均依赖服务端颁发的 httpOnly 会话 Cookie：`admin_session`。
- 获取会话：`GET /api/auth/admin/challenge`（返回 nonce）→ 使用钱包签名 → `POST /api/auth/admin/verify`（服务器校验签名 + 白名单，颁发会话）。
- 校验接口：`GET /api/auth/is-admin`（返回 `{ isAdmin, address, via: 'session' }`）。
- 不再接受自定义请求头 `X-Admin-Wallet` 或查询参数 `adminWallet`。

## � 邮件模板

项目内已包含一个示例邮件模板：`templates/email/verification.html`。可将其上传到腾讯云 SES 的"模板管理"，并在模板中使用变量 `{{appName}}`, `{{code}}`, `{{expireMinutes}}`。上传成功并审核通过后，将模板的数字 ID 配置到 `TENCENT_SES_TEMPLATE_ID`。

## �🔐 安全注意事项

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
