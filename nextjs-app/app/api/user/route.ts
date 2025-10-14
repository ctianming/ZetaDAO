import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

// GET /api/user?uid=...  (uid optional; if absent uses session uid)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const { searchParams } = new URL(request.url)
  const uidParam = searchParams.get('uid')
  const uid = uidParam || (session as any)?.uid
  if (!uid) return NextResponse.json({ error: '缺少 uid 或未登录' }, { status: 400 })
  const { data: user, error: uErr } = await supabaseAdmin
    .from('users')
    .select('uid,username,avatar_url,bio,role,metadata,created_at')
    .eq('uid', uid)
    .single()
  if (uErr && uErr.code !== 'PGRST116') return NextResponse.json({ error: '查询失败' }, { status: 500 })
  // identities
  const { data: identities } = await supabaseAdmin
    .from('user_identities')
    .select('provider,account_id,created_at')
    .eq('user_uid', uid)
  return NextResponse.json({ success: true, data: { user, identities } })
}

// PUT body: { uid?, username?, avatar_url?, bio? }
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const body = await request.json()
    const uid = body?.uid || (session as any)?.uid
    if (!uid) return NextResponse.json({ error: '缺少 uid 或未登录' }, { status: 400 })
    const update: any = {}
    if (body.username !== undefined) update.username = body.username
    if (body.avatar_url !== undefined) update.avatar_url = body.avatar_url
    if (body.bio !== undefined) update.bio = body.bio
    if (Object.keys(update).length === 0) return NextResponse.json({ error: '无更新字段' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(update)
      .eq('uid', uid)
      .select('uid,username,avatar_url,bio')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
