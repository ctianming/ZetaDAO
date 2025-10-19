import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const before = searchParams.get('before') // ISO timestamp cursor for created_at

    // fetch limit+1 to detect hasMore
    let query = supabaseAdmin
      .from('xp_events')
      .select('id,type,amount,content_id,submission_id,milestone,metadata,created_at')
      .eq('user_uid', s.uid)
      .order('created_at', { ascending: false })

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query.limit(limit + 1)

    if (error) throw error

    const items = (data || []).slice(0, limit)
    const hasMore = (data || []).length > limit
    const nextCursor = hasMore ? items[items.length - 1]?.created_at : null
    return NextResponse.json({ success: true, items, nextCursor, hasMore })
  } catch (e) {
    return NextResponse.json({ error: '获取 XP 记录失败' }, { status: 500 })
  }
}
