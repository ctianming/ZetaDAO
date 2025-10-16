import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: '缺少邮箱' }, { status: 400 })
    const now = Date.now()
    const { data: user, error } = await supabaseAdmin
      .from('auth_local_users')
      .select('id,email,updated_at,email_verified_at')
      .eq('email', email.toLowerCase())
      .single()
    if (error || !user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    if (user.email_verified_at) return NextResponse.json({ error: '该邮箱已完成验证' }, { status: 400 })

    // 冷却可选：这里不做强制阻断，交给前端倒计时节流

    const code = genCode()
    const expires = new Date(now + 15 * 60 * 1000).toISOString()
    const { error: updErr } = await supabaseAdmin
      .from('auth_local_users')
      .update({ verification_code: code, verification_expires: expires })
      .eq('id', user.id)
    if (updErr) return NextResponse.json({ error: '生成验证码失败' }, { status: 500 })

    try {
      await sendVerificationEmail(email, code)
      // Touch updated_at
      await supabaseAdmin.from('auth_local_users').update({ verification_code: code }).eq('id', user.id)
      return NextResponse.json({ success: true, devCode: process.env.NODE_ENV !== 'production' ? code : undefined })
    } catch (err) {
      console.error('resend sendVerificationEmail failed:', (err as Error)?.message)
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ success: true, devCode: code, note: '开发环境未实际发信，使用 devCode 测试' })
      }
      return NextResponse.json({ error: '邮件发送失败，请稍后再试' }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: '重发失败' }, { status: 500 })
  }
}
