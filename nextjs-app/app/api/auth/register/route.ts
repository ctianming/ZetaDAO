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
    if (!email || !password || !username) return NextResponse.json({ error: '缺少用户名、邮箱或密码' }, { status: 400 })
    const em = String(email).toLowerCase().trim()
    const un = String(username).trim()
    const pw = String(password)
    const emailOk = /.+@.+\..+/.test(em)
    if (!emailOk) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    if (un.length < 3 || un.length > 20) return NextResponse.json({ error: '用户名长度需在 3-20 之间' }, { status: 400 })
    if (!/^[-_a-zA-Z0-9\u4e00-\u9fa5]+$/.test(un)) return NextResponse.json({ error: '用户名仅可包含中文、字母、数字、下划线与短横线' }, { status: 400 })
    const hash = await bcrypt.hash(pw, 10)
    const code = genCode()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    // Check if email exists
    const { data: existed } = await supabaseAdmin
      .from('auth_local_users')
      .select('*')
      .eq('email', em)
      .maybeSingle()
    if (existed?.email_verified_at) {
      return NextResponse.json({ error: '该邮箱已注册且完成验证' }, { status: 409 })
    }
    // 不再使用 updated_at 作为冷却锚点，避免发信失败时阻塞重试
    let upsertOk = false
    if (existed) {
      const { error: updErr } = await supabaseAdmin
        .from('auth_local_users')
        .update({ password_hash: hash, verification_code: code, verification_expires: expires })
        .eq('id', existed.id)
      if (updErr) throw updErr
      upsertOk = true
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('auth_local_users')
        .insert({ email: em, password_hash: hash, verification_code: code, verification_expires: expires })
      if (insErr) throw insErr
      upsertOk = true
    }
    if (!upsertOk) return NextResponse.json({ error: '注册失败' }, { status: 500 })
    // 发送验证码邮件（开发环境下即便发送失败也返回 devCode 便于调试）
    try {
      await sendVerificationEmail(em, code)
      return NextResponse.json({ success: true, devCode: process.env.NODE_ENV !== 'production' ? code : undefined })
    } catch (err) {
      console.error('sendVerificationEmail failed:', (err as Error)?.message)
      if (process.env.NODE_ENV !== 'production') {
        // 开发环境：仍然返回成功与 devCode，便于继续验证流程
        return NextResponse.json({ success: true, devCode: code, note: '开发环境未实际发信，使用 devCode 测试' })
      }
      return NextResponse.json({ error: '邮件发送失败，请稍后再试' }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}
