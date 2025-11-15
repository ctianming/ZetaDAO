#!/usr/bin/env node
/**
 * 环境变量检查脚本
 * 用于诊断服务器配置问题
 * 
 * 使用方法:
 *   node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVar(name, required = false, secret = false) {
  const value = process.env[name];
  const hasValue = value && value.length > 0 && value !== 'dev-secret';
  
  if (hasValue) {
    const displayValue = secret ? '***' + value.slice(-4) : value;
    log(`✅ ${name}: ${displayValue}`, 'green');
    return true;
  } else if (required) {
    log(`❌ ${name}: NOT SET (REQUIRED)`, 'red');
    return false;
  } else {
    log(`⚠️  ${name}: NOT SET (optional)`, 'yellow');
    return true;
  }
}

log('\n🔍 环境变量检查\n', 'cyan');
log('='.repeat(60), 'blue');

// 加载 .env 文件（如果存在）
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  log(`\nℹ️  Loading .env.local from: ${envPath}`, 'blue');
  require('dotenv').config({ path: envPath });
} else {
  log(`\nℹ️  No .env.local file found. Checking system environment variables only.`, 'yellow');
}

log('\n📊 数据库配置\n', 'cyan');
let allValid = true;
allValid &= checkEnvVar('NEXT_PUBLIC_SUPABASE_URL', true);
allValid &= checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', true, true);
allValid &= checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', true, true);

log('\n🔐 认证配置\n', 'cyan');
allValid &= checkEnvVar('NEXTAUTH_SECRET', true, true);
allValid &= checkEnvVar('NEXTAUTH_URL', false);
checkEnvVar('GOOGLE_CLIENT_ID', false);
checkEnvVar('GOOGLE_CLIENT_SECRET', false, true);
checkEnvVar('GITHUB_CLIENT_ID', false);
checkEnvVar('GITHUB_CLIENT_SECRET', false, true);

log('\n👑 管理员配置\n', 'cyan');
allValid &= checkEnvVar('ADMIN_WALLETS', true);
checkEnvVar('ADMIN_SESSION_SECRET', false, true);

log('\n🌐 Web3 配置\n', 'cyan');
checkEnvVar('NEXT_PUBLIC_ZETA_CHAIN_ID', false);
checkEnvVar('NEXT_PUBLIC_ZETA_RPC_URL', false);
checkEnvVar('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', false);

log('\n' + '='.repeat(60), 'blue');

if (allValid) {
  log('\n✅ 所有必需的环境变量都已正确配置！\n', 'green');
  process.exit(0);
} else {
  log('\n❌ 存在缺失或无效的必需环境变量。请检查上述输出。\n', 'red');
  log('💡 提示: 请确保在服务器上设置了所有必需的环境变量。', 'yellow');
  log('   对于 Next.js 应用，可以在 .env.local 文件中设置，', 'yellow');
  log('   或者在部署平台（如 Vercel）的环境变量配置中设置。\n', 'yellow');
  process.exit(1);
}

