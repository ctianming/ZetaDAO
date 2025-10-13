#!/bin/bash

# ZetaDAO 项目初始化脚本
# 使用方法: chmod +x setup.sh && ./setup.sh

echo "🚀 ZetaDAO Next.js 项目初始化开始..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在 nextjs-app 目录下运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"
echo ""

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到 .env.local 文件"
    echo "📝 正在从示例文件创建..."
    
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ 已创建 .env.local 文件"
        echo ""
        echo "🔧 请编辑 .env.local 文件并填入您的配置："
        echo "   - NEXT_PUBLIC_SUPABASE_URL"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo "   - ADMIN_WALLETS"
        echo "   - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
        echo ""
    else
        echo "❌ 未找到 .env.local.example 文件"
        exit 1
    fi
else
    echo "✅ 环境变量文件已存在"
    echo ""
fi

# 显示下一步操作
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 初始化完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 接下来的步骤："
echo ""
echo "1️⃣  配置环境变量"
echo "   编辑 .env.local 文件并填入您的配置"
echo ""
echo "2️⃣  设置 Supabase 数据库"
echo "   - 访问 https://supabase.com/ 创建项目"
echo "   - 执行 supabase/migrations/001_initial_schema.sql"
echo ""
echo "3️⃣  启动开发服务器"
echo "   npm run dev"
echo ""
echo "4️⃣  访问应用"
echo "   打开浏览器访问 http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 更多信息请查看:"
echo "   - README.md (项目说明)"
echo "   - QUICKSTART.md (快速开始)"
echo "   - DEPLOYMENT.md (部署指南)"
echo ""
echo "🎉 祝您使用愉快！"
