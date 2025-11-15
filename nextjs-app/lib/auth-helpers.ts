/**
 * Auth.js v5 辅助函数
 * 提供服务端和客户端的认证工具
 */

import { auth } from '@/auth'

/**
 * 获取当前服务端会话
 * 替代 v4 的 getServerSession
 */
export async function getSession() {
  return await auth()
}

/**
 * 要求用户已登录，否则抛出错误
 */
export async function requireAuth() {
  const session = await auth()
  if (!session || !(session as any)?.uid) {
    throw new Error('Unauthorized')
  }
  return session
}

