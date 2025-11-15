/**
 * NextAuth.js 客户端错误日志端点
 * 
 * NextAuth v5 beta 的客户端会尝试向此端点发送错误日志
 * 但在某些配置下可能导致 400 错误
 * 
 * 这个自定义端点简单地接收并忽略这些日志，避免控制台报错
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 读取并忽略客户端发送的错误日志
    const body = await req.json().catch(() => ({}))
    
    // 在开发环境中可以打印日志用于调试
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Client Log]', body)
    }
    
    // 返回成功响应，避免客户端报错
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    // 即使出错也返回 200，避免客户端报错
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

// 也处理 GET 请求（虽然通常不会用到）
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}

