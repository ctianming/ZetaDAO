# ZetaDAO Portal — 本地运行与测试指南

本指南帮助你在本地完成环境配置、数据库初始化、启动服务与基本验证。

## 1. 准备环境变量
复制 `.env.local.example` 为 `.env.local` 并填写真实值：

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- 可选：ADMIN_WALLETS（用于本地 admin 钱包地址）、NEXT_PUBLIC_IPFS_GATEWAY 等

## 2. 初始化数据库（Supabase）
有两种方式任选其一：

- 在 Supabase 控制台 SQL Editor 粘贴执行 `supabase/migrations/001_initial_schema.sql`；
- 或使用本地 Supabase（Docker）后在 `psql`/SQL Editor 执行同样 SQL。

该迁移已包含：
- 所有表与索引、RLS 策略与更新触发器；
- RPC：`increment_user_submissions(user_wallet)` 与 `increment_approved_submissions(user_wallet)`。

初始化后建议：
- 在 `users` 表插入你的管理员钱包地址（或在 `.env` 的 `ADMIN_WALLETS` 中配置）；
- 在 `published_content` 插入 1~2 条示例数据用于页面可视化验证。

## 3. 安装依赖与启动

```bash
# 安装依赖（已安装可跳过）
npm install

# 开发启动
npm run dev
```

成功后访问：http://localhost:3000

## 4. 基本页面与流程验证
- 首页与导航：检查 `Header` 链接、连接钱包按钮是否出现。
- 文章/视频/活动/大使：若 DB 中有数据应可展示；为空则显示占位提示。
- 投稿：`/submit` 使用连接的钱包地址提交；
- 管理员审核：`/admin` 使用管理员钱包访问，执行 Approve/Reject；
- 已发布内容：通过 `/articles`、`/videos`、`/activities` 验证发布结果可见，详情页 `/articles/[id]` 浏览数会自增。

## 5. API 直连验证（可选）

```bash
# 获取已发布内容（示例：文章类，limit=5；可选筛选：articleCategory、tag）
curl "http://localhost:3000/api/content?category=article&limit=5&articleCategory=基础&tag=zeta"

# 提交投稿（示例）
curl -X POST http://localhost:3000/api/submit \
  -H 'Content-Type: application/json' \
  -d '{
    "walletAddress": "0xYourWallet",
    "title": "Hello ZetaDAO",
    "content": "<p>Test content</p>",
    "category": "article",
    "tags": ["zeta","demo"],
    "articleCategory": "基础",
    "imageUrl": null,
    "videoUrl": null,
    "externalLink": null
  }'

# 管理员获取投稿列表（待审核）
# 注意：管理员接口现基于已连接钱包的 httpOnly Cookie 进行鉴权。
# 建议在浏览器中使用 Header 的“连接钱包”按钮完成签名登录后，再在同一浏览器会话中访问管理员页面或调用接口。
curl "http://localhost:3000/api/submissions?status=pending"

# 管理员批准投稿（需要浏览器会话携带 Cookie；纯 curl 难以完成签名并设置 Cookie，建议用浏览器/Postman 复用 Cookie）
curl -X POST http://localhost:3000/api/approve \
  -H 'Content-Type: application/json' \
  -d '{"submissionId": "<uuid>"}'

# 全局搜索（q 支持标题/内容 ILIKE；可选：category, articleCategory, tag, limit, offset）
curl "http://localhost:3000/api/search?q=zeta&category=article&articleCategory=基础&tag=demo&limit=10&offset=0"

# 管理员拒绝投稿（同上，需 Cookie）
curl -X POST http://localhost:3000/api/reject \
  -H 'Content-Type: application/json' \
  -d '{"submissionId": "<uuid>", "reason": "Not fit"}'
```

## 6. 常见问题
- 构建期/启动期无法连接 WalletConnect：请确保 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 已填写；
- 列表为空：请检查数据库连接与是否插入了示例数据；
- 403/未授权：管理员接口基于 httpOnly Cookie 中的已验证钱包地址进行鉴权，请使用前端“连接钱包”完成签名以设置 Cookie，且该地址需在管理员名单（ENV: `ADMIN_WALLETS`）或 DB 中具备 admin 角色。

## 7. 合约（可选）
本项目后端已完成 off-chain 版 MVP；若需 on-chain 审计记录，可新增一个简易合约（如 ContentRegistry）记录 `submissionId/hash/actor/timestamp` 事件。可使用 Hardhat/Foundry 部署与测试。若需要我可以为仓库补上合约脚手架与测试用例。
