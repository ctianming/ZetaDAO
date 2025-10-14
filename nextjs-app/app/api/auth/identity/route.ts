import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

// POST: bind identity { provider, account_id }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
  const s = session as any
  if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const provider = body?.provider
    const accountId = body?.account_id
    if (!provider || !accountId) return NextResponse.json({ error: '缺少 provider 或 account_id' }, { status: 400 })
    if (!['wallet','google','github','email'].includes(provider)) return NextResponse.json({ error: '不支持的 provider' }, { status: 400 })
    // Ensure uniqueness
    const { data: existing } = await supabaseAdmin
      .from('user_identities')
      .select('id')
      .eq('provider', provider)
      .eq('account_id', accountId)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: '该身份已被绑定' }, { status: 409 })
    // Insert
    const { data, error } = await supabaseAdmin
      .from('user_identities')
      .insert({ user_uid: (session as any).uid, provider, account_id: accountId })
      .select('provider,account_id,created_at')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: '绑定失败' }, { status: 500 })
  }
}

// DELETE: /api/auth/identity?provider=...  (unbind)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
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
