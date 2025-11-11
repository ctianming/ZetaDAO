import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { mapPublishedRows } from '@/lib/transform'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const tag = url.searchParams.get('tag')?.trim()

  let query = supabase.from('published_content').select('*').eq('category', 'video')
  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    const maybeTag = q.startsWith('#') ? q.slice(1) : q
    if (maybeTag) query = query.overlaps('tags', [maybeTag])
  }
  if (tag) query = query.overlaps('tags', [tag])

  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: mapPublishedRows(data) })
}
