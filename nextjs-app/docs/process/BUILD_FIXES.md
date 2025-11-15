# 构建错误修复文档

## 修复时间
2025-11-15

## 修复的错误

### 1. 配置导入错误

#### 问题
`app/dynamics/page.tsx` 和 `app/shop/page.tsx` 使用了已移除的配置导出：
- `AUTO_REFRESH_ENABLED`
- `SWR_REFRESH_MS`
- `SWR_REVALIDATE_ON_FOCUS`
- `SWR_REVALIDATE_ON_RECONNECT`

#### 修复
更新导入和使用方式：

**修复前：**
```typescript
import { AUTO_REFRESH_ENABLED, SWR_REFRESH_MS, SWR_REVALIDATE_ON_FOCUS, SWR_REVALIDATE_ON_RECONNECT } from '@/lib/config'

if (AUTO_REFRESH_ENABLED && SWR_REFRESH_MS > 0) {
  timer = setInterval(() => load(true), SWR_REFRESH_MS)
}
```

**修复后：**
```typescript
import { refresh } from '@/lib/env'

if (refresh.enabled && refresh.intervalMs > 0) {
  timer = setInterval(() => load(true), refresh.intervalMs)
}
```

#### 影响文件
- ✅ `app/dynamics/page.tsx`
- ✅ `app/shop/page.tsx`

---

### 2. NextAuth v5 导入错误

#### 问题
`app/auth/error/page.tsx` 和 `app/u/[uid]/page.tsx` 使用了 v4 的 API：
- `getServerSession` 不再从 `next-auth` 导出
- `authOptions` 已弃用

#### 修复
使用新的 Auth.js v5 API：

**修复前：**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

const session = await getServerSession(authOptions)
```

**修复后：**
```typescript
import { auth } from '@/auth'

const session = await auth()
```

#### 影响文件
- ✅ `app/auth/error/page.tsx`
- ✅ `app/u/[uid]/page.tsx`

---

### 3. 未使用变量警告

#### 问题
ESLint 警告未使用的 `isLoading` 变量。

#### 修复
移除未使用的变量：

**修复前：**
```typescript
const { data, error, isLoading, isFetching } = useQuery({...})
```

**修复后：**
```typescript
const { data, error, isFetching } = useQuery({...})
```

#### 影响文件
- ✅ `app/ambassadors/page.tsx`
- ✅ `app/videos/page.tsx`

---

## 验证构建

请运行以下命令验证修复：

```bash
cd nextjs-app

# 使用 pnpm
pnpm build

# 或使用 npm
npm run build

# 或使用 yarn
yarn build
```

## 预期结果

构建应该成功完成，没有类型错误。可能仍会有一些 ESLint 警告（如 `react-hooks/exhaustive-deps`），但这些不会阻止构建。

## 剩余的警告（非阻塞）

以下警告不会影响构建，但可以在后续优化：

```
./components/admin/useEnsureAdminSession.tsx
211:6  Warning: React Hook useCallback has missing dependencies
233:6  Warning: React Hook useCallback has a missing dependency
```

这些是 React Hooks 依赖项警告，可以通过以下方式修复：
1. 添加缺失的依赖项
2. 使用 `useRef` 来避免依赖
3. 或者添加 ESLint 忽略注释（如果确认安全）

---

## 总结

所有阻塞构建的错误已修复：
- ✅ 配置导入错误（2 个文件）
- ✅ NextAuth API 错误（2 个文件）
- ✅ 未使用变量警告（2 个文件）

