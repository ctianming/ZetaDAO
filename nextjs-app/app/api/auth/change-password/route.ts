import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const currentPassword = body?.currentPassword || ''
    const newPassword = body?.newPassword || ''
    if (!currentPassword || !newPassword) return NextResponse.json({ error: '缺少密码字段' }, { status: 400 })
    if (newPassword.length < 8) return NextResponse.json({ error: '新密码长度至少8位' }, { status: 400 })

    // Find auth_local_users via email identity or fallback username/email session.user
    let email: string | null = null
    // Find email identity
    const { data: identities } = await supabaseAdmin
      .from('user_identities')
      .select('provider,account_id')
      .eq('user_uid', s.uid)
    const emailIdent = identities?.find(i => i.provider === 'email')
    if (emailIdent) email = emailIdent.account_id
    if (!email) return NextResponse.json({ error: '未绑定邮箱账号' }, { status: 400 })

    const { data: authUser } = await supabaseAdmin
      .from('auth_local_users')
      .select('id,password_hash')
      .eq('email', email)
      .single()
    if (!authUser?.password_hash) return NextResponse.json({ error: '未设置密码' }, { status: 400 })

    const ok = await bcrypt.compare(currentPassword, authUser.password_hash)
    if (!ok) return NextResponse.json({ error: '当前密码错误' }, { status: 400 })

    const newHash = await bcrypt.hash(newPassword, 10)
    const { error: updErr } = await supabaseAdmin
      .from('auth_local_users')
      .update({ password_hash: newHash })
      .eq('id', authUser.id)
    if (updErr) throw updErr
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '修改失败' }, { status: 500 })
  }
}
