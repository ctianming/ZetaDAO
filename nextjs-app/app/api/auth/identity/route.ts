import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { cookies } from 'next/headers'
import { verifyMessage, type Address, type Hex } from 'viem'

// POST: bind identity { provider, account_id }
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const provider = body?.provider
    let accountId = body?.account_id
    if (!provider || !accountId) return NextResponse.json({ error: '缺少 provider 或 account_id' }, { status: 400 })
    if (!['wallet','google','github','email'].includes(provider)) return NextResponse.json({ error: '不支持的 provider' }, { status: 400 })
    let message: string | undefined
    let signature: string | undefined
    if (provider === 'wallet') {
      accountId = String(accountId || '').toLowerCase()
      message = body?.message
      signature = body?.signature
      if (!message || !signature) return NextResponse.json({ error: '缺少签名信息' }, { status: 400 })
      const nonceCookie = cookies().get('wallet_nonce')?.value
      if (!nonceCookie || !message.includes(nonceCookie)) return NextResponse.json({ error: '签名过期，请重新进行钱包验证' }, { status: 400 })
      const ok = await verifyMessage({ address: accountId as Address, message, signature: signature as Hex })
      if (!ok) return NextResponse.json({ error: '签名校验失败' }, { status: 400 })
    }
    // Ensure uniqueness (case-insensitive for wallets)
    const { data: existing } = await supabaseAdmin
      .from('user_identities')
      .select('id,user_uid,account_id')
      .eq('provider', provider)
      .ilike('account_id', accountId)
      .maybeSingle()
    if (existing) {
      if (existing.user_uid === s.uid) {
        if (existing.account_id !== accountId) {
          await supabaseAdmin
            .from('user_identities')
            .update({ account_id: accountId })
            .eq('id', existing.id)
        }
        if (provider === 'wallet') {
          await supabaseAdmin
            .from('users')
            .update({ wallet_address: accountId })
            .eq('uid', s.uid)
        }
        return NextResponse.json({ success: true, data: { provider, account_id: accountId } })
      }
      return NextResponse.json({ error: '该身份已被其他账号绑定' }, { status: 409 })
    }
    // Insert
    const { data, error } = await supabaseAdmin
      .from('user_identities')
  .insert({ user_uid: s.uid, provider, account_id: accountId })
      .select('provider,account_id,created_at')
      .single()
    if (error) {
      const code = (error as any)?.code
      if (code === '23505') return NextResponse.json({ error: '该身份已被绑定' }, { status: 409 })
      throw error
    }
    if (provider === 'wallet') {
      await supabaseAdmin
        .from('users')
        .update({ wallet_address: accountId })
  .eq('uid', s.uid)
    }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const message = (e as any)?.message ? String((e as any).message) : '绑定失败'
    return NextResponse.json({ error: message.includes('23505') ? '该身份已被绑定' : '绑定失败' }, { status: 500 })
  }
}

// DELETE: /api/auth/identity?provider=...  (unbind)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')
    if (!provider) return NextResponse.json({ error: '缺少 provider' }, { status: 400 })
    if (!['wallet','google','github','email'].includes(provider)) return NextResponse.json({ error: '不支持的 provider' }, { status: 400 })
    // Prevent removing last identity
    const { data: identities } = await supabaseAdmin
    .from('user_identities')
    .select('id,provider')
    .eq('user_uid', s.uid)
    if (!identities || identities.length <= 1) return NextResponse.json({ error: '至少保留一个身份' }, { status: 400 })
    // Delete provider for user
    const { error } = await supabaseAdmin
    .from('user_identities')
    .delete()
    .eq('user_uid', s.uid)
      .eq('provider', provider)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '解绑失败' }, { status: 500 })
  }
}
