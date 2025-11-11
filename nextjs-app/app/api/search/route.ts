export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const category = searchParams.get('category') || undefined
    const articleCategory = searchParams.get('articleCategory') || undefined
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!q) {
      return NextResponse.json({ success: true, data: [], pagination: { total: 0, limit, offset } })
    }

    let query = supabase
      .from('published_content')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category', category)
    if (articleCategory) query = query.eq('article_category', articleCategory)

    // 标签搜索：仅当 q 以 # 开头时，追加标签条件；否则不强制与标签重叠，避免过度收紧查询
    if (q.startsWith('#')) {
      const tag = q.slice(1)
      if (tag) query = query.overlaps('tags', [tag])
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      pagination: { total: count || 0, limit, offset },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
