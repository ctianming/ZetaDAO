# ZetaDAO Portal 部署指南

本指南将帮助您快速部署 ZetaDAO 社区门户。

## 📋 前置准备

### 1. 注册必要的服务

- ✅ [Vercel](https://vercel.com/) - 用于前端部署
- ✅ [Supabase](https://supabase.com/) - 用于数据库
- ✅ [WalletConnect Cloud](https://cloud.walletconnect.com/) - 获取 Project ID

### 2. 本地环境要求

- Node.js 16+ 
- npm/yarn/pnpm
- Git

## 🚀 快速部署（5分钟）

### 方式一：一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/ZetaDAO)

点击按钮后：
1. 连接您的 GitHub 账号
2. Fork 仓库
3. 配置环境变量（见下方）
4. 点击 Deploy

### 方式二：手动部署

#### Step 1: 设置 Supabase

1. 登录 [Supabase](https://supabase.com/)
2. 创建新项目
3. 进入 SQL Editor，执行 `supabase/migrations/001_initial_schema.sql`
4. 复制项目 URL 和 anon key（Settings > API）

#### Step 2: 获取 WalletConnect Project ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 创建新项目
3. 复制 Project ID

#### Step 3: 配置环境变量

创建 `.env.local` 文件：

```bash
# 应用配置
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Admin 钱包地址（替换为您的地址）
ADMIN_WALLETS=0x1234567890123456789012345678901234567890,0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

# ZetaChain
NEXT_PUBLIC_ZETA_CHAIN_ID=7001
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
```

#### Step 4: 本地测试

```bash
cd nextjs-app
npm install
npm run dev
```

访问 http://localhost:3000 验证功能。

#### Step 5: 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 添加环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... 添加所有环境变量

# 生产部署
vercel --prod
```

## 🔧 配置详解

### Supabase RLS 策略

默认情况下，数据库已启用行级安全（RLS）。如果需要调整权限：

```sql
-- 允许匿名用户读取已发布内容
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公开访问" ON published_content
    FOR SELECT USING (true);
```

### Admin 权限配置

在 `.env.local` 中添加管理员钱包地址：

```env
ADMIN_WALLETS=0xYourAddress1,0xYourAddress2
```

这些地址将拥有：
- 审核投稿权限
- 发布/删除内容权限
- 管理用户权限

### 自定义域名

在 Vercel 项目设置中：
1. Domains > Add Domain
2. 输入您的域名
3. 按照提示配置 DNS

## 📊 监控和维护

### Vercel 监控

- 访问 Vercel Dashboard 查看：
  - 部署历史
  - 函数调用次数
  - 带宽使用
  - 错误日志

### Supabase 监控

- 访问 Supabase Dashboard 查看：
  - 数据库大小
  - API 请求量
  - 慢查询
  - 存储使用

### 日志查看

```bash
# Vercel 日志
vercel logs

# 实时日志
vercel logs --follow
```

## 🔒 安全检查清单

在生产环境部署前，请确认：

- [ ] 已更新所有环境变量
- [ ] Admin 钱包地址正确
- [ ] Supabase RLS 策略已启用
- [ ] API Rate Limiting 已配置
- [ ] CORS 设置正确
- [ ] 移除了测试数据
- [ ] 备份了数据库
- [ ] 设置了错误监控

## 🆘 常见问题

### Q: 连接不上 Supabase？
A: 检查 Supabase URL 和 Key 是否正确，确保没有多余空格。

### Q: 钱包连接失败？
A: 确认 WalletConnect Project ID 正确，检查网络是否为 ZetaChain。

### Q: Admin 面板进不去？
A: 确认您的钱包地址在 ADMIN_WALLETS 环境变量中。

### Q: 部署后样式错误？
A: 清除 Vercel 缓存：`vercel build --force`

## 📈 扩展指南

### 添加新功能

1. 在 `app/` 下创建新路由
2. 添加对应的 API 路由
3. 更新 Supabase 表结构
4. 添加新的 TypeScript 类型

### 性能优化

- 使用 Next.js Image 组件
- 启用 ISR（增量静态再生成）
- 配置 CDN 缓存策略
- 数据库查询优化

### 国际化

```bash
npm install next-intl
```

参考 Next.js i18n 文档配置多语言。

## 🎉 部署完成！

访问您的域名，开始使用 ZetaDAO 社区门户！

需要帮助？
- 📧 Email: support@zetadao.com
- 💬 Discord: discord.gg/zetadao
- 🐦 Twitter: @ZetaDAO
