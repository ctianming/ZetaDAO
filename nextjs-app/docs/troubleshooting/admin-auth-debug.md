# 管理员认证问题排查指南

## 问题描述
在生产环境中，管理员页面的"开始认证"和"重新连接"按钮点击后没有反应，F12 控制台没有看到任何 POST 请求。

## 可能的原因

### 1. **客户端 JavaScript 未正确加载或初始化**
- **症状**: 按钮点击无反应，控制台没有任何日志
- **原因**: 
  - Next.js 构建时的代码分割问题
  - Wagmi/RainbowKit 配置在生产环境中初始化失败
  - React 水合（hydration）错误导致事件监听器未绑定

### 2. **钱包连接器未正确初始化**
- **症状**: 点击按钮后控制台出现错误，但没有网络请求
- **原因**:
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 环境变量缺失或无效
  - 钱包扩展未安装或被禁用
  - 浏览器安全策略阻止了钱包连接

### 3. **事件处理函数未正确绑定**
- **症状**: 按钮可以点击，但没有任何响应
- **原因**:
  - React Hook 依赖项不完整导致函数引用过期
  - `useCallback` 闭包问题
  - 组件渲染时机问题

## 排查步骤

### 步骤 1: 检查浏览器控制台日志

打开 F12 开发者工具，刷新页面，查看控制台是否有以下日志：

```
[Providers] 初始化 Wagmi 配置
[Providers] 组件已挂载
[useEnsureAdminSession] __zd_admin_refresh assigned on window
```

**如果没有这些日志**：
- 说明 Providers 或 Hook 没有正确初始化
- 检查是否有 JavaScript 错误阻止了组件渲染
- 检查网络标签页，确认所有 JS 文件都已成功加载

### 步骤 2: 手动触发认证流程

在浏览器控制台中执行：

```javascript
// 检查全局函数是否存在
console.log('__zd_admin_refresh 存在:', typeof window.__zd_admin_refresh === 'function')

// 手动触发认证
if (window.__zd_admin_refresh) {
  window.__zd_admin_refresh()
}
```

**如果函数不存在**：
- 说明 `useEnsureAdminSession` Hook 没有正确初始化
- 检查 `/admin` 页面是否正确渲染

**如果函数存在但调用后无反应**：
- 查看控制台是否有新的错误日志
- 继续下一步排查

### 步骤 3: 检查钱包连接状态

在控制台执行：

```javascript
// 检查钱包是否已连接
console.log('Ethereum provider:', window.ethereum)
console.log('已连接的账户:', await window.ethereum?.request({ method: 'eth_accounts' }))
```

**如果 `window.ethereum` 不存在**：
- 用户没有安装钱包扩展（如 MetaMask）
- 引导用户安装钱包

**如果账户为空数组**：
- 钱包未授权当前网站
- 需要先连接钱包

### 步骤 4: 检查环境变量

确认以下环境变量在生产环境中正确配置：

```bash
# 必需的环境变量
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-secret-key
ADMIN_WALLETS=0x1234...,0x5678...  # 管理员钱包地址（小写）

# 可选但推荐
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
NEXT_PUBLIC_ZETA_CHAIN_ID=7001
NEXT_PUBLIC_ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
```

**验证方法**：
在服务器上运行：
```bash
cd /path/to/your/app
cat .env.local | grep -E "ADMIN_WALLETS|NEXTAUTH_SECRET"
```

### 步骤 5: 检查网络请求

点击"开始认证"按钮后，在 Network 标签页中应该看到以下请求序列：

1. `GET /api/auth/is-admin` - 检查现有会话
2. `POST /api/auth/admin/challenge` - 获取签名挑战
3. (钱包签名操作 - 不会显示在 Network 中)
4. `POST /api/auth/admin/verify` - 验证签名

**如果没有任何请求**：
- 说明点击事件没有触发 `refresh()` 函数
- 检查按钮是否被 CSS 遮挡（`pointer-events: none`）
- 检查是否有其他 JavaScript 错误阻止了执行

**如果只有第 1 步请求**：
- 说明 `refresh()` 函数被调用了，但后续逻辑有问题
- 检查控制台日志，应该有 `[useEnsureAdminSession] 开始认证流程`

### 步骤 6: 测试按钮点击事件

在控制台执行：

```javascript
// 查找按钮元素
const authButton = document.querySelector('button:contains("开始认证")')
console.log('认证按钮:', authButton)

// 检查按钮是否被禁用
console.log('按钮是否禁用:', authButton?.disabled)

// 手动触发点击
authButton?.click()
```

## 已修复的问题

### 修复 1: 添加详细的控制台日志
- 在 `useEnsureAdminSession` 和 `AdminPage` 中添加了 `console.log`
- 现在可以追踪认证流程的每一步

### 修复 2: 完善 Hook 依赖项
- 修复了 `run` 函数的 `useCallback` 依赖项
- 确保函数引用始终是最新的

### 修复 3: 添加 `e.preventDefault()`
- 防止按钮的默认行为干扰事件处理

### 修复 4: 优化 Providers 初始化
- 添加 `mounted` 状态确保客户端正确初始化
- 添加初始化日志便于排查

## 常见解决方案

### 解决方案 1: 清除浏览器缓存和 Cookie
```bash
# 在浏览器中
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 或者在 Application 标签页中清除站点数据
```

### 解决方案 2: 重新构建和部署
```bash
# 在服务器上
cd /path/to/your/app/nextjs-app
rm -rf .next
npm run build
pm2 restart your-app  # 或使用您的进程管理器
```

### 解决方案 3: 检查钱包扩展
- 确保 MetaMask 或其他钱包扩展已安装并启用
- 尝试在钱包中手动切换到正确的网络
- 尝试断开并重新连接钱包

### 解决方案 4: 使用不同的浏览器或设备
- 在隐私/无痕模式下测试
- 尝试不同的浏览器（Chrome, Firefox, Brave）
- 在移动设备上使用 MetaMask 应用内浏览器

## 生产环境特殊注意事项

### HTTPS 要求
- 钱包连接在生产环境中**必须使用 HTTPS**
- 确保您的域名配置了有效的 SSL 证书
- 检查 Nginx/Apache 配置是否正确代理 WebSocket 连接

### CSP (内容安全策略)
如果您的网站配置了 CSP，确保允许以下内容：
```
script-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.walletconnect.com wss://*.walletconnect.com;
```

### CORS 配置
确保 API 路由允许来自您的域名的请求。

## 紧急调试模式

如果以上方法都无效，可以临时启用"无签名模式"进行测试：

```bash
# 在 .env.local 中添加
NEXT_PUBLIC_ADMIN_ALLOW_NO_SIGN=true
```

**警告**: 这会跳过签名验证，仅用于调试！生产环境中务必移除此配置。

## 获取帮助

如果问题仍未解决，请收集以下信息：

1. 浏览器控制台的完整日志（包括错误）
2. Network 标签页的请求列表截图
3. 服务器日志（如果有）
4. 使用的浏览器和钱包扩展版本
5. 环境变量配置（隐藏敏感信息）

然后在项目的 Issue 中提交详细报告。

