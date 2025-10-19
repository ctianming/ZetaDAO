export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const articleCategory = searchParams.get('articleCategory')
  const tag = searchParams.get('tag')
  const authorUid = searchParams.get('authorUid')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('published_content')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (articleCategory) query = query.eq('article_category', articleCategory)
  if (tag) query = query.overlaps('tags', [tag])
  if (authorUid) query = query.eq('author_uid', authorUid)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Get content error:', error)
    return NextResponse.json(
      { error: '获取内容失败' },
      { status: 500 }
    )
  }
}
