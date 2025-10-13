# 🚀 ZetaDAO Next.js 项目快速启动指南

## ✅ 项目已创建完成

恭喜！您的 Next.js 版 ZetaDAO 社区门户已经创建完成。以下是项目的完整架构和启动步骤。

---

## 📁 项目结构概览

```
nextjs-app/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   ├── providers.tsx             # Web3 Provider配置
│   ├── globals.css               # 全局样式
│   ├── articles/                 # 文章模块
│   │   ├── page.tsx              # 文章列表
│   │   └── [id]/page.tsx         # 文章详情
│   ├── videos/page.tsx           # 视频列表
│   ├── activities/page.tsx       # 活动列表
│   ├── ambassadors/page.tsx      # 大使名录
│   ├── submit/page.tsx           # 投稿页面
│   ├── admin/page.tsx            # 管理员审核面板
│   └── api/                      # API Routes
│       ├── submit/route.ts       # 投稿API
│       ├── submissions/route.ts  # 获取投稿列表
│       ├── approve/route.ts      # 审核通过
│       ├── reject/route.ts       # 审核拒绝
│       └── content/route.ts      # 获取已发布内容
├── components/                   # React组件
│   ├── layout/
│   │   └── Header.tsx            # 顶部导航
│   ├── home/
│   │   ├── Hero.tsx              # 首页Hero区域
│   │   ├── NewsTicker.tsx        # 新闻滚动条
│   │   └── QuickLinks.tsx        # 快速链接
│   └── content/
│       └── ArticleCard.tsx       # 文章卡片组件
├── lib/                          # 工具库
│   ├── db.ts                     # Supabase客户端
│   ├── auth.ts                   # 认证&权限控制
│   └── utils.ts                  # 工具函数
├── types/
│   └── index.ts                  # TypeScript类型定义
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # 数据库初始化脚本
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── README.md                     # 使用文档
└── DEPLOYMENT.md                 # 部署指南
```

---

## 🎯 功能特性

### ✨ 已实现的功能

1. **首页** - Hero区域、新闻滚动条、快速导航
2. **内容展示**
   - ✅ 技术文章列表和详情
   - ✅ 会议视频回放
   - ✅ 社区活动展示
   - ✅ 大使名录展示
3. **投稿系统**
   - ✅ 用户钱包连接
   - ✅ 内容投稿表单
   - ✅ 支持文章、视频、活动三种类型
4. **管理员审核**
   - ✅ 待审核列表
   - ✅ 批准/拒绝功能
   - ✅ 自动发布
   - ✅ 权限控制
5. **数据存储**
   - ✅ Supabase 数据库集成
   - ✅ 完整的数据表结构
   - ✅ 行级安全策略（RLS）

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd nextjs-app
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 复制示例文件
cp .env.local.example .env.local
```

编辑 `.env.local`，填入您的配置：

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase（需要先创建Supabase项目）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Admin钱包地址（替换为您的地址）
ADMIN_WALLETS=0x1234...,0x5678...

# WalletConnect Project ID（从 cloud.walletconnect.com 获取）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# ZetaChain配置
NEXT_PUBLIC_ZETA_CHAIN_ID=7001
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
```

### 3. 设置 Supabase 数据库

1. 访问 [Supabase](https://supabase.com/) 创建项目
2. 进入 SQL Editor
3. 执行 `supabase/migrations/001_initial_schema.sql` 文件内容
4. 验证表已创建成功

### 4. 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 📝 使用流程

### 用户投稿流程

1. 访问网站
2. 点击右上角"连接钱包"
3. 进入"投稿"页面
4. 填写投稿表单
5. 提交并等待审核

### Admin审核流程

1. 使用Admin钱包地址登录
2. 访问 `/admin` 路径
3. 查看待审核列表
4. 点击"批准"或"拒绝"按钮
5. 批准的内容自动发布

---

## 🔧 常见配置

### 添加Admin权限

在 `.env.local` 中添加钱包地址：

```env
ADMIN_WALLETS=0xYourAddress1,0xYourAddress2,0xYourAddress3
```

### 修改主题颜色

编辑 `tailwind.config.ts`：

```typescript
primary: {
  DEFAULT: "#00d4aa",  // 修改为您想要的颜色
  // ...
}
```

### 添加新的内容类型

1. 更新 `types/index.ts` 中的 ContentCategory
2. 修改数据库表的 category CHECK 约束
3. 添加对应的页面路由
4. 更新投稿表单选项

---

## 🌐 部署到生产环境

### 方式一：Vercel（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 配置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ADMIN_WALLETS

# 生产部署
vercel --prod
```

### 方式二：Docker

```dockerfile
# 创建 Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📊 数据库表说明

| 表名 | 说明 |
|------|------|
| `submissions` | 用户投稿记录 |
| `published_content` | 已发布的内容 |
| `users` | 用户信息 |
| `ambassadors` | 社区大使信息 |
| `likes` | 点赞记录 |
| `comments` | 评论记录 |
| `audit_logs` | 审计日志 |

---

## 🔒 安全建议

- ✅ 定期更新依赖包
- ✅ 使用环境变量存储敏感信息
- ✅ 启用 Supabase RLS（行级安全）
- ✅ 实施 Rate Limiting
- ✅ 定期备份数据库
- ✅ 监控 API 调用日志

---

## 📚 参考文档

- [Next.js 14 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [wagmi 文档](https://wagmi.sh/)
- [Tailwind CSS](https://tailwindcss.com/)
- [ZetaChain 开发文档](https://www.zetachain.com/docs)

---

## 🆘 故障排除

### Q: npm install 报错？
A: 尝试删除 `node_modules` 和 `package-lock.json`，然后重新安装

### Q: Supabase 连接失败？
A: 检查环境变量是否正确，确认没有多余空格

### Q: 钱包连接不上？
A: 确认 WalletConnect Project ID 正确，检查网络配置

### Q: Admin面板访问被拒绝？
A: 确认您的钱包地址在 `ADMIN_WALLETS` 环境变量中

### Q: TypeScript 报错？
A: 运行 `npm install` 确保所有类型定义已安装

---

## 🎉 下一步

1. ✅ 自定义主题和品牌
2. ✅ 添加更多内容类型
3. ✅ 实现社交分享功能
4. ✅ 集成 ZetaChain 智能合约
5. ✅ 添加评论和点赞功能
6. ✅ 实现搜索和筛选
7. ✅ 添加国际化支持

---

## 💡 技术支持

需要帮助？
- 📧 Email: support@zetadao.com
- 💬 Discord: discord.gg/zetadao
- 🐦 Twitter: @ZetaDAO
- 📖 文档: docs.zetadao.com

---

**祝您使用愉快！🚀**
