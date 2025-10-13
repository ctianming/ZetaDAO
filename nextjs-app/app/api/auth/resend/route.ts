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
      .select('id,email,updated_at')
      .eq('email', email.toLowerCase())
      .single()
    if (error || !user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    // 60 秒冷却
    const last = user.updated_at ? new Date(user.updated_at).getTime() : 0
    if (now - last < 60_000) {
      const remain = Math.ceil((60_000 - (now - last)) / 1000)
      return NextResponse.json({ error: `请 ${remain}s 后再试` }, { status: 429 })
    }

    const code = genCode()
    const expires = new Date(now + 15 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('auth_local_users')
      .update({ verification_code: code, verification_expires: expires })
      .eq('id', user.id)

    try { await sendVerificationEmail(email, code) } catch {}
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '重发失败' }, { status: 500 })
  }
}
