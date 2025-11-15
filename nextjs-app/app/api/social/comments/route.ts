import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

// GET /api/social/comments?postId=...&before=...&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = String(searchParams.get('postId') || '')
    if (!postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 })
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const before = searchParams.get('before')

    let query = supabaseAdmin
      .from('user_post_comments')
      .select('id,post_id,user_uid,content,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    if (before) query = query.lt('created_at', before)

    const { data, error } = await query.limit(limit + 1)
    if (error) throw error
    const items = (data || []).slice(0, limit)
    const hasMore = (data || []).length > limit
    const nextCursor = hasMore ? items[items.length - 1]?.created_at : null
    return NextResponse.json({ success: true, items, nextCursor, hasMore })
  } catch (e) {
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

// POST /api/social/comments { postId, content }
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const postId = String(body?.postId || '')
    const content = String(body?.content || '').trim()
    if (!postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 })
    if (!content) return NextResponse.json({ error: '评论不能为空' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('user_post_comments')
      .insert({ post_id: postId, user_uid: s.uid, content })
      .select('id,created_at')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: '发布评论失败' }, { status: 500 })
  }
}
