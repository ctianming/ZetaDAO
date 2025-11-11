import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { mapPublishedRows } from '@/lib/transform'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const articleCategory = url.searchParams.get('articleCategory') || undefined
  const tag = url.searchParams.get('tag') || undefined
  const qParam = url.searchParams.get('q') || undefined

  let query = supabase.from('published_content').select('*').eq('category', 'article')
  if (articleCategory) query = query.eq('article_category', articleCategory)
  if (tag) query = query.overlaps('tags', [tag])
  if (qParam) {
    const q = qParam.trim()
    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      // 仅在 #tag 语法时才增加标签重叠条件，避免将普通关键字误当作标签而过滤掉结果
      if (q.startsWith('#')) {
        const tag = q.slice(1)
        if (tag) query = query.overlaps('tags', [tag])
      }
    }
  }

  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: mapPublishedRows(data) })
}
