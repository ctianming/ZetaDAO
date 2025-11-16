/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用静态优化以避免预渲染错误
  // 这些页面需要客户端上下文（wagmi/react-query）
  experimental: {
    // 允许更灵活的渲染策略
  },
  // 生成唯一的构建 ID 用于调试和缓存失效
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  webpack: (config) => {
    // Silence optional deps that are Node-only or not needed in browser bundles
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }
    return config
  },
  images: {
    domains: ['localhost', 'vercel.app', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // Allow Unsplash images used in demo/test data
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'ZetaDAO Community Portal',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID || 'dev',
  },
  async redirects() {
    return [
      // 将 NextAuth 的错误与回退登录页直接引导到自定义错误页
      { source: '/api/auth/error', destination: '/auth/error', permanent: false },
      { source: '/api/auth/signin', has: [{ type: 'query', key: 'error' }], destination: '/auth/error', permanent: false },
    ]
  },
}

module.exports = nextConfig
