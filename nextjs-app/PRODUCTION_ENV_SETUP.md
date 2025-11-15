# 生产环境配置指南 - 修复 NextAuth.js 错误

## 🚨 问题说明

您遇到的错误：
```
[auth][error] UnknownAction: Cannot parse action at /api/auth/_log
[auth][error] UnknownAction: Unsupported action
```

**根本原因**：NextAuth.js 在生产环境中无法正确解析请求 URL，导致无法识别认证动作。

---

## ✅ 已完成的代码修复

我已经在代码中完成了以下修复：

### 1. 在 `lib/env.ts` 中添加了 `AUTH_URL` 配置
```typescript
export const auth = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
  url: process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // ... 其他配置
}
```

### 2. 在 `auth.ts` 中添加了 `basePath` 配置
```typescript
export const nextAuthConfig: NextAuthConfig = {
  trustHost: true,
  basePath: '/api/auth', // ← 明确指定 API 路由基础路径
  // ...
}
```

---

## 🔧 服务器部署步骤

### 步骤 1：配置环境变量

在服务器上找到您的 `.env` 或 `.env.local` 文件（通常在 `/www/wwwroot/ZetaDAO/nextjs-app/` 目录下），添加或修改以下环境变量：

```bash
# ============================================
# 🔐 认证配置（必需）
# ============================================

# NextAuth.js 密钥（必需，生产环境必须设置）
# 生成方法：openssl rand -base64 32
NEXTAUTH_SECRET=your-super-secret-key-here

# 应用 URL（必需，修复 UnknownAction 错误的关键）
# 格式：https://your-domain.com 或 http://your-server-ip:port
# ⚠️ 注意：
#   - 如果使用 HTTPS，必须以 https:// 开头
#   - 如果使用 HTTP，必须以 http:// 开头
#   - 不要在末尾加斜杠 /
#   - 如果使用非标准端口（如 :3000），请包含端口号
AUTH_URL=https://your-domain.com

# 或者使用 NEXTAUTH_URL（向后兼容）
# NEXTAUTH_URL=https://your-domain.com

# 或者使用 NEXT_PUBLIC_APP_URL（会被 AUTH_URL 覆盖）
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ============================================
# 🗄️ 数据库配置（必需）
# ============================================

# Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase 匿名密钥（公开密钥）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase 服务角色密钥（私密密钥，仅服务端使用）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase 存储桶名称（可选，默认为 avatars）
SUPABASE_STORAGE_BUCKET=avatars

# ============================================
# 🔑 OAuth 配置（可选）
# ============================================

# Google OAuth（如果启用 Google 登录）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth（如果启用 GitHub 登录）
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ============================================
# 👑 管理员配置（可选）
# ============================================

# 管理员钱包地址（逗号分隔，小写）
ADMIN_WALLETS=0xabcd1234...,0xefgh5678...

# 管理员会话密钥
ADMIN_SESSION_SECRET=your-admin-session-secret

# ============================================
# 🌐 Web3 配置（可选）
# ============================================

# ZetaChain 链 ID
NEXT_PUBLIC_ZETA_CHAIN_ID=7001

# ZetaChain RPC URL
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public

# ZetaChain 区块浏览器
NEXT_PUBLIC_ZETA_EXPLORER_BASE=https://athens.explorer.zetachain.com

# WalletConnect 项目 ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# ============================================
# 📱 腾讯云短信配置（可选）
# ============================================

TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key
TENCENT_SMS_APP_ID=your-sms-app-id
TENCENT_SMS_SIGN_NAME=your-sms-sign-name
TENCENT_SMS_TEMPLATE_ID=your-sms-template-id

# ============================================
# ⚙️ 功能开关（可选）
# ============================================

# 启用商店功能
NEXT_PUBLIC_ENABLE_SHOP=true

# 启用社交功能
NEXT_PUBLIC_ENABLE_SOCIAL=true

# 启用 XP 系统
NEXT_PUBLIC_ENABLE_XP=true

# 启用自动刷新
NEXT_PUBLIC_AUTO_REFRESH_ENABLED=true

# 刷新间隔（毫秒）
NEXT_PUBLIC_REFRESH_INTERVAL_MS=15000

# 窗口聚焦时重新验证
NEXT_PUBLIC_REVALIDATE_ON_FOCUS=true

# 网络重连时重新验证
NEXT_PUBLIC_REVALIDATE_ON_RECONNECT=true
```

---

### 步骤 2：拉取最新代码

```bash
cd /www/wwwroot/ZetaDAO/nextjs-app
git pull
```

---

### 步骤 3：安装依赖

```bash
pnpm install
```

---

### 步骤 4：重新构建

```bash
pnpm build
```

---

### 步骤 5：重启应用（最关键！）

#### 如果使用 PM2：
```bash
# 查看所有应用
pm2 list

# 重启应用
pm2 restart <your-app-name>

# 或者使用应用 ID
pm2 restart <app-id>

# 查看日志
pm2 logs <your-app-name>
```

#### 如果手动运行：
```bash
# 找到并停止旧进程
ps aux | grep 'next-start'
kill <PID>

# 重新启动
pnpm start
```

#### 如果使用 Docker：
```bash
docker-compose restart
```

---

### 步骤 6：验证

1. **检查服务器日志**：
   ```bash
   pm2 logs <your-app-name>
   ```
   
   应该看到类似以下的日志（没有错误）：
   ```
   ℹ️  [NextAuth] Skipping Google provider (credentials not configured)
   ℹ️  [NextAuth] Skipping GitHub provider (credentials not configured)
   ```

2. **在浏览器中测试**：
   - 访问您的网站
   - 尝试登录
   - 使用 `Ctrl + Shift + R` 强制刷新浏览器缓存

3. **检查浏览器控制台**：
   - 打开开发者工具（F12）
   - 查看 Console 和 Network 标签页
   - 确认没有 `UnknownAction` 或 `UntrustedHost` 错误

---

## 🔍 常见问题排查

### 问题 1：仍然出现 `UnknownAction` 错误

**可能原因**：
- `AUTH_URL` 环境变量未正确设置
- 应用未重启，仍在使用旧配置

**解决方案**：
1. 确认 `.env` 文件中 `AUTH_URL` 已正确设置
2. 确保 `AUTH_URL` 格式正确（包含协议，不包含尾部斜杠）
3. 完全重启应用：`pm2 restart <app-name> --update-env`

---

### 问题 2：`AUTH_URL` 应该设置为什么？

**示例**：

| 场景 | AUTH_URL 值 |
|------|-------------|
| 使用域名 + HTTPS | `https://zetadao.com` |
| 使用域名 + HTTP | `http://zetadao.com` |
| 使用 IP + 端口 | `http://123.45.67.89:3000` |
| 使用子域名 | `https://app.zetadao.com` |

**注意事项**：
- ✅ 正确：`https://zetadao.com`
- ❌ 错误：`https://zetadao.com/`（末尾有斜杠）
- ❌ 错误：`zetadao.com`（缺少协议）
- ❌ 错误：`https://zetadao.com/api/auth`（包含路径）

---

### 问题 3：如何生成 `NEXTAUTH_SECRET`？

在服务器上运行：
```bash
openssl rand -base64 32
```

将输出的字符串复制到 `.env` 文件中：
```bash
NEXTAUTH_SECRET=生成的密钥
```

---

### 问题 4：Nginx 反向代理配置

如果您使用 Nginx 作为反向代理，请确保以下配置正确：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**关键配置**：
- `proxy_set_header Host $host;` - 确保 NextAuth.js 能正确识别域名
- `proxy_set_header X-Forwarded-Proto $scheme;` - 确保 HTTPS 正确传递

---

### 问题 5：如何验证环境变量是否生效？

在 Next.js 应用中临时添加日志：

```typescript
// 在 auth.ts 顶部添加
console.log('[Auth] AUTH_URL:', process.env.AUTH_URL)
console.log('[Auth] NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('[Auth] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
```

重启应用后查看日志：
```bash
pm2 logs <your-app-name>
```

---

## 📞 需要帮助？

如果完成上述步骤后问题仍然存在，请提供以下信息：

1. **您的 `AUTH_URL` 设置是什么？**（可以隐藏域名，只告诉我格式）
2. **您是否使用了 Nginx 或其他反向代理？**
3. **服务器日志中是否还有其他错误信息？**
4. **浏览器控制台中是否有错误信息？**

---

## 🎉 成功标志

当一切配置正确后，您应该：

✅ 能够正常访问登录页面  
✅ 能够使用 Google/GitHub/邮箱登录  
✅ 服务器日志中没有 `UnknownAction` 错误  
✅ 浏览器控制台中没有认证相关错误  

---

**最后提醒**：修改环境变量后，**必须重启应用**才能生效！这是最常被忽略的步骤。

