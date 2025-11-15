import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid') || ''
    const followingOnly = searchParams.get('following') === '1'
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const before = searchParams.get('before')
    let query = supabaseAdmin.from('user_posts').select('id,user_uid,content,images,created_at').order('created_at', { ascending: false })
    if (uid) query = query.eq('user_uid', uid)
    if (followingOnly) {
      // require session to know who is following
      const session = await auth()
      const s = session as any
      if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
      // get followings
      const { data: followings } = await supabaseAdmin.from('user_follows').select('following_uid').eq('follower_uid', s.uid)
      const ids = (followings || []).map((r:any)=>r.following_uid)
      if (ids.length === 0) return NextResponse.json({ success: true, items: [], nextCursor: null, hasMore: false })
      query = query.in('user_uid', ids)
    }
    if (before) query = query.lt('created_at', before)
    const { data, error } = await query.limit(limit + 1)
    if (error) throw error
    const items = (data || []).slice(0, limit)
    const hasMore = (data || []).length > limit
    const nextCursor = hasMore ? items[items.length - 1]?.created_at : null

    let profiles: Record<string, { username?: string | null; avatar_url?: string | null }> = {}
    const uids = Array.from(new Set(items.map((it: any) => it.user_uid).filter(Boolean)))
    if (uids.length > 0) {
      const { data: users, error: userErr } = await supabaseAdmin
        .from('users')
        .select('uid,username,avatar_url')
        .in('uid', uids)
      if (!userErr && users) {
        profiles = Object.fromEntries(
          users.map((user: any) => [user.uid, { username: user.username, avatar_url: user.avatar_url }])
        )
      }
    }

    return NextResponse.json({ success: true, items, nextCursor, hasMore, profiles })
  } catch (e) {
    return NextResponse.json({ error: '获取动态失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const content = String(body?.content || '').trim()
    const images = Array.isArray(body?.images) ? body.images.slice(0, 9) : []
    if (!content) return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('user_posts').insert({ user_uid: s.uid, content, images }).select('id').single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: '发布动态失败' }, { status: 500 })
  }
}
