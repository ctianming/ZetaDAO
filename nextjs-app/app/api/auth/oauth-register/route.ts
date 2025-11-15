import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

/**
 * OAuth Registration API
 * This endpoint is called after OAuth callback to link the OAuth account to a new user
 */
export async function POST(request: NextRequest) {
  try {
    const { provider, accountId, username, avatarUrl } = await request.json()
    
    if (!provider || !accountId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    if (!['google', 'github'].includes(provider)) {
      return NextResponse.json({ error: '不支持的登录方式' }, { status: 400 })
    }
    
    // Check if this OAuth account is already linked
    const { data: existingIdent } = await supabaseAdmin
      .from('user_identities')
      .select('user_uid')
      .eq('provider', provider)
      .eq('account_id', accountId)
      .maybeSingle()
    
    if (existingIdent?.user_uid) {
      return NextResponse.json({ error: '此账号已注册' }, { status: 409 })
    }
    
    // Create new user
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        username: username || null,
        avatar_url: avatarUrl || null,
        wallet_address: null, // Wallet is decoupled
        bio: null,
      })
      .select('uid')
      .single()
    
    if (userError || !newUser?.uid) {
      console.error('[OAuth Register] Failed to create user:', userError)
      return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
    }
    
    // Create identity
    const { error: identError } = await supabaseAdmin
      .from('user_identities')
      .insert({
        user_uid: newUser.uid,
        provider,
        account_id: accountId,
      })
    
    if (identError) {
      console.error('[OAuth Register] Failed to create identity:', identError)
      // Rollback: delete the user
      await supabaseAdmin.from('users').delete().eq('uid', newUser.uid)
      return NextResponse.json({ error: '创建身份关联失败' }, { status: 500 })
    }
    
    console.log(`[OAuth Register] Successfully registered ${provider} account:`, accountId)
    
    return NextResponse.json({ 
      success: true, 
      uid: newUser.uid,
      message: '注册成功，请重新登录'
    })
    
  } catch (err) {
    console.error('[OAuth Register] Error:', err)
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}

