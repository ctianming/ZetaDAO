# 紧急修复：NextAuth 认证错误

## 问题说明

您遇到的错误：
```
[auth][error] UnknownAction: Cannot parse action at /api/auth/_log
[auth][error] UnknownAction: Unsupported action
[next-auth][error][CLIENT_FETCH_ERROR] Cannot convert undefined or null to object
/api/auth/_log:1 Failed to load resource: the server responded with a status of 400
```

**根本原因**：
1. NextAuth.js 在生产环境中无法确定您的网站 URL
2. NextAuth v5 beta 的客户端错误日志功能有 bug
3. 自定义错误页面显示了错误的提示信息

---

## ✅ 已完成的代码修复

我已经在代码中完成了以下关键修复：

### 1. 在 `lib/env.ts` 中硬编码生产环境 URL
```typescript
export const auth = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
  url: process.env.AUTH_URL || process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'production' ? 'https://zetadao.site' : 'http://localhost:3000'),
  // ...
}
```

### 2. 在 `auth.ts` 中自动设置环境变量
```typescript
// 在生产环境中明确设置 AUTH_URL 环境变量
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.AUTH_URL = authConfig.url
  console.log('[Auth] Setting AUTH_URL from config:', authConfig.url)
}
```

### 3. 删除了误导性的错误页面
- 删除了 `app/auth/error/page.tsx`
- 移除了 NextAuth 配置中的自定义错误页面设置
- 现在登录失败会直接在登录框中显示错误信息

### 4. 创建自定义 `_log` 端点
- 新增 `app/api/auth/_log/route.ts`
- 拦截并处理 NextAuth 客户端的错误日志请求
- 避免 400 错误和控制台报错

### 5. 改进登录表单错误处理
- 添加了 try-catch 包裹
- 添加了输入验证
- 改进了错误提示信息

---

## 🚀 服务器部署步骤（立即执行）

### 步骤 1：连接到服务器
```bash
ssh your-user@your-server
```

### 步骤 2：进入项目目录
```bash
cd /www/wwwroot/ZetaDAO/nextjs-app
```

### 步骤 3：拉取最新代码
```bash
git pull
```

### 步骤 4：重新构建（必需！）
```bash
pnpm build
```

**⚠️ 重要**：这一步会花费 1-3 分钟，请耐心等待。构建过程会将新的配置编译到生产代码中。

### 步骤 5：重启应用（最关键！）

#### 如果使用 PM2：
```bash
# 查看所有应用
pm2 list

# 重启应用（替换 <app-name> 为您的应用名称）
pm2 restart <app-name>

# 或者使用应用 ID
pm2 restart 0

# 查看日志，确认没有错误
pm2 logs <app-name> --lines 50
```

#### 如果手动运行：
```bash
# 找到并停止旧进程
ps aux | grep 'next-start'
kill <PID>

# 重新启动
pnpm start
```

### 步骤 6：验证修复

1. **检查服务器日志**：
   ```bash
   pm2 logs <app-name>
   ```
   
   **应该看到**：
   ```
   [Auth] Setting AUTH_URL from config: https://zetadao.site
   ```

2. **在浏览器中测试**：
   - 访问 `https://zetadao.site`
   - 尝试登录
   - 使用 `Ctrl + Shift + R` 强制刷新浏览器缓存

3. **确认没有错误**：
   - 不应该再看到 `UnknownAction` 错误
   - 不应该被重定向到 `/auth/error`
   - 登录应该正常工作

---

## 🔍 如果问题仍然存在

### 检查清单

1. **确认代码已拉取**：
   ```bash
   cd /www/wwwroot/ZetaDAO/nextjs-app
   git log -1
   ```
   确认最新的 commit 包含了修复。

2. **确认已重新构建**：
   ```bash
   ls -lh /www/wwwroot/ZetaDAO/nextjs-app/.next
   ```
   检查 `.next` 目录的修改时间是否是最近的。

3. **确认应用已重启**：
   ```bash
   pm2 list
   # 查看 "restart" 列，应该显示最近的重启时间
   ```

4. **清除浏览器缓存**：
   - 打开开发者工具（F12）
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

5. **检查 Nginx 配置**（如果使用）：
   ```bash
   cat /etc/nginx/sites-available/zetadao.site
   ```
   
   确保有以下配置：
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

---

## 📝 长期解决方案（可选）

虽然当前的修复已经硬编码了 URL，但长期来看，最佳实践是在服务器环境中设置环境变量：

### 方法 1：在 `.env` 文件中设置
```bash
cd /www/wwwroot/ZetaDAO/nextjs-app
echo "AUTH_URL=https://zetadao.site" >> .env
```

### 方法 2：在 PM2 配置中设置
如果您使用 PM2，可以在 `ecosystem.config.js` 中添加：
```javascript
module.exports = {
  apps: [{
    name: 'zetadao',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      AUTH_URL: 'https://zetadao.site',
      // ... 其他环境变量
    }
  }]
}
```

然后重启：
```bash
pm2 restart ecosystem.config.js --update-env
```

---

## 🎯 预期结果

完成上述步骤后，您应该：

✅ 不再看到 `UnknownAction` 错误  
✅ 不再被重定向到 `/auth/error`  
✅ 能够正常使用 Google/GitHub/邮箱登录  
✅ 服务器日志中看到 `[Auth] Setting AUTH_URL from config: https://zetadao.site`  

---

## 💡 为什么这次修复能解决问题？

1. **硬编码生产 URL**：在 `lib/env.ts` 中，当检测到是生产环境时，自动使用 `https://zetadao.site`。
2. **自动设置环境变量**：在 `auth.ts` 中，如果环境变量未设置，代码会自动将 URL 写入 `process.env.AUTH_URL`。
3. **NextAuth.js 读取**：NextAuth.js 内部会读取 `AUTH_URL` 环境变量，从而正确构建和解析所有认证路由。

这个修复确保了即使您没有在服务器环境中手动设置 `AUTH_URL`，应用也能正常工作。

---

## 📞 需要帮助？

如果完成上述步骤后问题仍然存在，请提供：

1. **服务器日志**：
   ```bash
   pm2 logs <app-name> --lines 100 > logs.txt
   ```
   
2. **构建输出**：
   ```bash
   pnpm build 2>&1 | tee build.log
   ```

3. **浏览器控制台错误**（F12 → Console 标签页）

---

**最后提醒**：
1. **必须重新构建**（`pnpm build`）
2. **必须重启应用**（`pm2 restart`）
3. **必须清除浏览器缓存**（`Ctrl + Shift + R`）

这三步缺一不可！

