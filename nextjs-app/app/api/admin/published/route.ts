import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'

// GET /api/admin/published?type=article&q=...&page=1&limit=20
export async function GET(req: NextRequest) {
  if (!isAdminFromSession(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const q = url.searchParams.get('q')?.trim()
    const category = url.searchParams.get('category')?.trim()
    const author = url.searchParams.get('author')?.trim()
    const sortBy = url.searchParams.get('sortBy') || 'published_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    if (!type) {
      return NextResponse.json({ success: false, error: 'Missing type parameter' }, { status: 400 })
    }

    // Base query for data
    let dataQuery = supabaseAdmin
      .from('published_content')
      .select('*')
      .eq('category', type)

    // Base query for count
    let countQuery = supabaseAdmin
      .from('published_content')
      .select('id', { count: 'exact', head: true })
      .eq('category', type)

    if (category) {
      dataQuery = dataQuery.eq('article_category', category)
      countQuery = countQuery.eq('article_category', category)
    }

    if (author) {
      dataQuery = dataQuery.ilike('author_name', `%${author}%`)
      countQuery = countQuery.ilike('author_name', `%${author}%`)
    }

    if (q) {
      const like = `%${q}%`
      dataQuery = dataQuery.or(`title.ilike.${like},content.ilike.${like},author_name.ilike.${like}`)
      countQuery = countQuery.or(`title.ilike.${like},content.ilike.${like},author_name.ilike.${like}`)
    }

    // Execute queries in parallel
    const [dataResult, countResult] = await Promise.all([
      dataQuery.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1),
      countQuery
    ])

    if (dataResult.error) throw dataResult.error
    if (countResult.error) throw countResult.error

    return NextResponse.json({
      success: true,
      data: dataResult.data,
      count: countResult.count,
    })

  } catch (error: any) {
    console.error('List published content error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

