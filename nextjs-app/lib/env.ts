/**
 * 环境变量配置模块
 * 集中管理和验证所有环境变量
 * 提供类型安全的访问接口
 */

// ============================================
// 服务端环境变量（仅在服务端可用）
// ============================================

/**
 * 数据库配置
 */
export const db = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'avatars',
} as const

/**
 * 认证配置
 */
export const auth = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleTimeout: parseInt(process.env.NEXTAUTH_GOOGLE_TIMEOUT_MS || '', 10) || 15000,
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
} as const

/**
 * 管理员配置
 */
export const admin = {
  wallets: (process.env.ADMIN_WALLETS || '')
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean),
  sessionSecret: process.env.ADMIN_SESSION_SECRET || process.env.SIGNING_KEY || 'dev-admin-secret',
} as const

/**
 * 腾讯云配置
 */
export const tencent = {
  secretId: process.env.TENCENT_SECRET_ID || '',
  secretKey: process.env.TENCENT_SECRET_KEY || '',
  smsAppId: process.env.TENCENT_SMS_APP_ID || '',
  smsSignName: process.env.TENCENT_SMS_SIGN_NAME || '',
  smsTemplateId: process.env.TENCENT_SMS_TEMPLATE_ID || '',
} as const

// ============================================
// 客户端环境变量（NEXT_PUBLIC_ 前缀）
// ============================================

/**
 * 应用配置
 */
export const app = {
  name: 'ZetaDAO Community Portal',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

/**
 * Web3 配置
 */
export const web3 = {
  chainId: Number(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001'),
  rpcUrl: process.env.NEXT_PUBLIC_ZETA_RPC_URL || '',
  explorerBase: (process.env.NEXT_PUBLIC_ZETA_EXPLORER_BASE || '').replace(/\/$/, ''),
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
} as const

/**
 * 数据刷新配置
 */
export const refresh = {
  enabled: (process.env.NEXT_PUBLIC_AUTO_REFRESH_ENABLED ?? 'true') !== 'false',
  intervalMs: Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || '15000'),
  onFocus: (process.env.NEXT_PUBLIC_REVALIDATE_ON_FOCUS ?? 'true') !== 'false',
  onReconnect: (process.env.NEXT_PUBLIC_REVALIDATE_ON_RECONNECT ?? 'true') !== 'false',
} as const

/**
 * 功能开关
 */
export const features = {
  enableShop: (process.env.NEXT_PUBLIC_ENABLE_SHOP ?? 'true') !== 'false',
  enableSocial: (process.env.NEXT_PUBLIC_ENABLE_SOCIAL ?? 'true') !== 'false',
  enableXP: (process.env.NEXT_PUBLIC_ENABLE_XP ?? 'true') !== 'false',
} as const

// ============================================
// 工具函数
// ============================================

/**
 * 检查是否为开发环境
 */
export function isDev() {
  return process.env.NODE_ENV === 'development'
}

/**
 * 检查是否为生产环境
 */
export function isProd() {
  return process.env.NODE_ENV === 'production'
}

/**
 * 检查是否为测试环境
 */
export function isTest() {
  return process.env.NODE_ENV === 'test'
}

/**
 * 验证必需的环境变量是否已设置
 */
export function validateEnv() {
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': db.supabaseUrl,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': db.supabaseAnonKey,
    'SUPABASE_SERVICE_ROLE_KEY': db.supabaseServiceKey,
    'NEXTAUTH_SECRET': auth.secret,
  }

  const missing: string[] = []
  for (const [key, value] of Object.entries(required)) {
    if (!value || value === 'dev-secret') {
      missing.push(key)
    }
  }

  if (missing.length > 0 && isProd()) {
    console.error('❌ 缺少必需的环境变量:', missing.join(', '))
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (missing.length > 0 && isDev()) {
    console.warn('⚠️  缺少环境变量（开发环境）:', missing.join(', '))
  }
}

// 在模块加载时验证环境变量
if (typeof window === 'undefined') {
  validateEnv()
}

