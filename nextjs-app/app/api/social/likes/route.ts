import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

// GET /api/social/likes?ids=a,b,c  -> returns counts per post and which ones current user liked
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idsParam = String(searchParams.get('ids') || '')
    const ids = idsParam.split(',').map(s=>s.trim()).filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ success: true, counts: {}, liked: [] })

    // Fetch counts grouped by post_id using SQL via RPC-like single query
    // Fallback approach: fetch rows and count in memory to avoid creating a DB function
    const { data: likesRows, error } = await supabaseAdmin
      .from('user_post_likes')
      .select('post_id')
      .in('post_id', ids)
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const r of likesRows || []) {
      counts[r.post_id] = (counts[r.post_id] || 0) + 1
    }

    // Which of these the current user liked
    const session = await auth()
    const s = session as any
    let liked: string[] = []
    if (s?.uid) {
      const { data: likedRows } = await supabaseAdmin
        .from('user_post_likes')
        .select('post_id')
        .eq('user_uid', s.uid)
        .in('post_id', ids)
      liked = (likedRows || []).map((r:any)=> r.post_id)
    }

    return NextResponse.json({ success: true, counts, liked })
  } catch (e) {
    return NextResponse.json({ error: '获取点赞数据失败' }, { status: 500 })
  }
}

// POST /api/social/likes  { postId }
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const postId = String(body?.postId || '')
    if (!postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 })

    let liked = false
    const { error: insertErr } = await supabaseAdmin
      .from('user_post_likes')
      .insert({ user_uid: s.uid, post_id: postId })
    if (insertErr) {
      if ((insertErr as any).code === '23505') {
        // already liked -> toggle off
        const { error: delErr } = await supabaseAdmin
          .from('user_post_likes')
          .delete()
          .match({ user_uid: s.uid, post_id: postId })
        if (delErr) throw delErr
        liked = false
      } else {
        throw insertErr
      }
    } else {
      liked = true
    }

    // get new count
    const { count } = await supabaseAdmin
      .from('user_post_likes')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({ success: true, liked, likes: count || 0 })
  } catch (e) {
    return NextResponse.json({ error: '更新点赞失败' }, { status: 500 })
  }
}
