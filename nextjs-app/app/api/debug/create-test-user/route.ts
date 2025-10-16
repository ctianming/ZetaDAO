import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password, username, walletAddress } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '缺少 email 或 password' }, { status: 400 })
    }

    // 1) 创建/查找主 users 行
    let userUid: string | null = null
    if (walletAddress) {
      // 如果提供了钱包，优先通过钱包 identity 绑定
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'wallet')
        .eq('account_id', walletAddress)
        .maybeSingle()
      if (ident?.user_uid) userUid = ident.user_uid
    }

    if (!userUid) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .insert({ username: username || null, wallet_address: walletAddress || null })
        .select('uid')
        .single()
      userUid = user?.uid || null
    }

    if (!userUid) return NextResponse.json({ error: '创建用户失败' }, { status: 500 })

    // 2) 创建本地登录账号（邮箱+密码）并设置已验证
    const password_hash = await bcrypt.hash(password, 10)
    await supabaseAdmin
      .from('auth_local_users')
      .upsert({
        email,
        username: username || null,
        password_hash,
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })

    // 3) 创建 email identity 绑定
    const { data: emailIdent } = await supabaseAdmin
      .from('user_identities')
      .select('id')
      .eq('provider', 'email')
      .eq('account_id', email)
      .maybeSingle()
    if (!emailIdent) {
      await supabaseAdmin.from('user_identities').insert({ user_uid: userUid, provider: 'email', account_id: email })
    }

    // 4) 如有钱包，创建 wallet identity 绑定
    if (walletAddress) {
      const { data: wIdent } = await supabaseAdmin
        .from('user_identities')
        .select('id')
        .eq('provider', 'wallet')
        .eq('account_id', walletAddress)
        .maybeSingle()
      if (!wIdent) {
        await supabaseAdmin.from('user_identities').insert({ user_uid: userUid, provider: 'wallet', account_id: walletAddress })
      }
    }

    return NextResponse.json({ success: true, data: { uid: userUid, email, username: username || null, walletAddress: walletAddress || null } })
  } catch (e) {
    console.error('create-test-user error', e)
    return NextResponse.json({ error: '创建测试用户失败' }, { status: 500 })
  }
}
