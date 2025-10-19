import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    const now = new Date().toISOString()
    const { data: user, error } = await supabaseAdmin
      .from('auth_local_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()
    if (error || !user) return NextResponse.json({ error: '用户不存在' }, { status: 400 })
    if (user.verification_code !== code || (user.verification_expires && user.verification_expires < now)) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 })
    }
    await supabaseAdmin.from('auth_local_users').update({ email_verified_at: now, verification_code: null, verification_expires: null }).eq('id', user.id)
    // 将用户名同步到 users 表（仅当该邮箱有 identity 时）
    try {
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'email')
        .eq('account_id', user.email)
        .maybeSingle()
      if (ident?.user_uid && user.username) {
        await supabaseAdmin.from('users').update({ username: user.username }).eq('uid', ident.user_uid)
      }
    } catch {}
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '验证失败' }, { status: 500 })
  }
}
