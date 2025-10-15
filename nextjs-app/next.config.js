/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    domains: ['localhost', 'vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'ZetaDAO Community Portal',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
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
