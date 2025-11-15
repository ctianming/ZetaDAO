import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

/**
 * Link OAuth account to existing user
 * This endpoint is called when a logged-in user wants to link their Google/GitHub account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const uid = (session as any)?.uid
    
    if (!uid) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    
    const { provider, accountId } = await request.json()
    
    if (!provider || !accountId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    if (!['google', 'github'].includes(provider)) {
      return NextResponse.json({ error: '不支持的登录方式' }, { status: 400 })
    }
    
    // Check if this OAuth account is already linked to another user
    const { data: existingIdent } = await supabaseAdmin
      .from('user_identities')
      .select('user_uid')
      .eq('provider', provider)
      .eq('account_id', accountId)
      .maybeSingle()
    
    if (existingIdent?.user_uid) {
      if (existingIdent.user_uid === uid) {
        return NextResponse.json({ error: '此账号已绑定到当前用户' }, { status: 409 })
      } else {
        return NextResponse.json({ error: '此账号已绑定到其他用户' }, { status: 409 })
      }
    }
    
    // Link the OAuth account to current user
    const { error: identError } = await supabaseAdmin
      .from('user_identities')
      .insert({
        user_uid: uid,
        provider,
        account_id: accountId,
      })
    
    if (identError) {
      console.error('[Link OAuth] Failed to create identity:', identError)
      return NextResponse.json({ error: '绑定失败' }, { status: 500 })
    }
    
    console.log(`[Link OAuth] Successfully linked ${provider} account to user ${uid}`)
    
    return NextResponse.json({ 
      success: true,
      message: `${provider === 'google' ? 'Google' : 'GitHub'} 账号已成功绑定`
    })
    
  } catch (err) {
    console.error('[Link OAuth] Error:', err)
    return NextResponse.json({ error: '绑定失败' }, { status: 500 })
  }
}

/**
 * Unlink OAuth account from user
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    const uid = (session as any)?.uid
    
    if (!uid) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    
    const { provider } = await request.json()
    
    if (!provider) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    // Delete the identity
    const { error: deleteError } = await supabaseAdmin
      .from('user_identities')
      .delete()
      .eq('user_uid', uid)
      .eq('provider', provider)
    
    if (deleteError) {
      console.error('[Unlink OAuth] Failed to delete identity:', deleteError)
      return NextResponse.json({ error: '解绑失败' }, { status: 500 })
    }
    
    console.log(`[Unlink OAuth] Successfully unlinked ${provider} account from user ${uid}`)
    
    return NextResponse.json({ 
      success: true,
      message: `${provider === 'google' ? 'Google' : 'GitHub'} 账号已解绑`
    })
    
  } catch (err) {
    console.error('[Unlink OAuth] Error:', err)
    return NextResponse.json({ error: '解绑失败' }, { status: 500 })
  }
}

