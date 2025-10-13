import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendVerificationEmail } from '@/lib/email'

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()
    if (!email || !password) return NextResponse.json({ error: '缺少邮箱或密码' }, { status: 400 })
    const hash = await bcrypt.hash(password, 10)
    const code = genCode()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
      .from('auth_local_users')
      .insert({ email: email.toLowerCase(), username: username || null, password_hash: hash, verification_code: code, verification_expires: expires })
      .select('id,email')
      .single()
    if (error) throw error
  // 发送验证邮件（生产环境实际发送，开发环境也尝试发送但仍返回 devCode 便于测试）
  try { await sendVerificationEmail(email, code) } catch {}
  return NextResponse.json({ success: true, devCode: process.env.NODE_ENV !== 'production' ? code : undefined })
  } catch (e) {
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}
