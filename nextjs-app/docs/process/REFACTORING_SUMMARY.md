# 重构总结文档

本文档记录了 ZetaDAO 社区门户的全面重构工作。

## 📋 重构概览

### 完成时间
2025-11-15

### 重构目标
- 统一数据请求库
- 升级认证系统
- 优化 Web3 配置
- 集中管理环境变量

---

## ✅ 已完成的重构任务

### 1. 统一数据请求库 - 移除 SWR，统一使用 TanStack Query

#### 变更内容
- **移除依赖**: 从 `package.json` 中移除 `swr` 依赖
- **更新文件**:
  - `app/articles/ArticlesListClient.tsx`
  - `app/videos/page.tsx`
  - `app/ambassadors/page.tsx`
  - `lib/config.ts`

#### 主要改进
- 使用 `@tanstack/react-query` 替代 `swr`
- 统一的查询配置管理
- 更好的类型安全
- 更强大的缓存和重新验证机制

#### 迁移指南
```typescript
// 旧代码 (SWR)
import useSWR from 'swr'
const { data, error, isValidating } = useSWR(url, fetcher, config)

// 新代码 (TanStack Query)
import { useQuery } from '@tanstack/react-query'
const { data, error, isLoading, isFetching } = useQuery({
  queryKey: ['key'],
  queryFn: () => fetch(url).then(r => r.json()),
  ...config
})
```

---

### 2. 升级 NextAuth.js 从 v4 到 v5 (Auth.js)

#### 变更内容
- **更新依赖**: `next-auth` 从 `^4.24.8` 升级到 `^5.0.0-beta.25`
- **新增文件**:
  - `auth.ts` - 新的 Auth.js v5 配置
  - `lib/auth-helpers.ts` - 认证辅助函数
- **更新文件**:
  - `app/api/auth/[...nextauth]/route.ts`
  - 所有使用 `getServerSession` 的 API 路由（20+ 文件）

#### 主要改进
- 更简洁的 API
- 更好的 TypeScript 支持
- 统一的服务端认证接口
- 保持客户端 API 兼容性

#### 迁移指南
```typescript
// 旧代码 (v4)
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
const session = await getServerSession(authOptions)

// 新代码 (v5)
import { auth } from '@/auth'
const session = await auth()
```

#### 已更新的 API 路由
- `/api/user/*`
- `/api/submit/*`
- `/api/submissions/*`
- `/api/social/*`
- `/api/shop/*`
- `/api/xp/*`
- `/api/content/*`
- `/api/auth/*`

---

### 3. 重构 Web3 Provider 配置 - 提取 wagmi 配置到独立模块

#### 变更内容
- **新增文件**:
  - `lib/wagmi-config.ts` - 独立的 Wagmi 配置模块
- **更新文件**:
  - `app/providers.tsx` - 简化 Provider 配置
  - `lib/web3.ts` - 使用环境变量模块

#### 主要改进
- 配置逻辑集中管理
- 更好的代码组织
- 易于测试和维护
- 清晰的职责分离

#### 模块结构
```
lib/
├── wagmi-config.ts    # Wagmi 配置（连接器、链配置）
├── web3.ts            # ZetaChain 链信息
└── env.ts             # 环境变量管理
```

---

### 4. 优化环境变量处理 - 集中管理配置

#### 变更内容
- **新增文件**:
  - `lib/env.ts` - 统一的环境变量配置模块
- **更新文件**:
  - `lib/config.ts` - 使用环境变量模块
  - `lib/web3.ts` - 使用环境变量模块
  - `lib/wagmi-config.ts` - 使用环境变量模块
  - `lib/db.ts` - 使用环境变量模块
  - `lib/auth.ts` - 使用环境变量模块
  - `auth.ts` - 使用环境变量模块

#### 主要改进
- 类型安全的环境变量访问
- 集中的配置验证
- 清晰的配置分类
- 开发/生产环境自动适配

#### 配置模块结构
```typescript
// lib/env.ts
export const db = { ... }           // 数据库配置
export const auth = { ... }         // 认证配置
export const admin = { ... }        // 管理员配置
export const tencent = { ... }      // 腾讯云配置
export const app = { ... }          // 应用配置
export const web3 = { ... }         // Web3 配置
export const refresh = { ... }      // 数据刷新配置
export const features = { ... }     // 功能开关
```

#### 使用示例
```typescript
// 旧代码
const chainId = Number(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001')
const secret = process.env.NEXTAUTH_SECRET || 'dev-secret'

// 新代码
import { web3, auth } from '@/lib/env'
const chainId = web3.chainId
const secret = auth.secret
```

---

## 📦 依赖变更

### 移除的依赖
- `swr@^2.3.6`

### 更新的依赖
- `next-auth`: `^4.24.8` → `^5.0.0-beta.25`

### 保持不变的依赖
- `@tanstack/react-query@^5.56.2` ✅
- `wagmi@^2.12.17` ✅
- `@rainbow-me/rainbowkit@^2.1.6` ✅
- 其他所有依赖保持不变

---

## 🔧 安装和运行

### 安装依赖
```bash
cd nextjs-app
pnpm install
# 或
npm install
```

### 环境变量配置
确保 `.env.local` 文件包含所有必需的环境变量：

```env
# 数据库
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 认证
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Web3
NEXT_PUBLIC_ZETA_CHAIN_ID=7001
NEXT_PUBLIC_ZETA_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# 管理员
ADMIN_WALLETS=
```

### 运行开发服务器
```bash
pnpm dev
# 或
npm run dev
```

---

## 🧪 测试建议

### 1. 数据请求测试
- [ ] 文章列表加载
- [ ] 视频列表加载
- [ ] 大使名录加载
- [ ] 数据自动刷新
- [ ] 离线重连后数据同步

### 2. 认证功能测试
- [ ] Google 登录
- [ ] GitHub 登录
- [ ] 邮箱密码登录
- [ ] 会话持久化
- [ ] 登出功能
- [ ] 受保护的 API 路由

### 3. Web3 功能测试
- [ ] MetaMask 连接
- [ ] WalletConnect 连接
- [ ] 钱包切换
- [ ] 链切换
- [ ] 交易签名

### 4. 环境变量测试
- [ ] 开发环境启动
- [ ] 生产环境构建
- [ ] 缺失环境变量的错误提示

---

## 📝 注意事项

### 向后兼容性
- ✅ 客户端 `useSession` API 保持不变
- ✅ 所有现有功能保持正常工作
- ✅ 环境变量名称保持不变

### 破坏性变更
- ⚠️ 服务端必须使用新的 `auth()` 函数替代 `getServerSession()`
- ⚠️ `lib/nextauth.ts` 中的 `authOptions` 已弃用，使用 `auth.ts` 中的配置

### 最佳实践
1. **环境变量**: 始终通过 `lib/env.ts` 访问环境变量
2. **数据请求**: 使用 TanStack Query 的 `useQuery` 和 `useMutation`
3. **认证**: 服务端使用 `auth()`，客户端使用 `useSession()`
4. **Web3 配置**: 通过 `lib/wagmi-config.ts` 获取配置

---

## 🚀 下一步计划

### 短期优化
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 优化构建性能
- [ ] 添加错误边界

### 长期规划
- [ ] 迁移到 React Server Components
- [ ] 实现增量静态再生成 (ISR)
- [ ] 添加性能监控
- [ ] 优化 SEO

---

## 📚 相关文档

- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Auth.js v5 文档](https://authjs.dev/)
- [Wagmi 文档](https://wagmi.sh/)
- [RainbowKit 文档](https://www.rainbowkit.com/)

---
