import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    requireAdminFromSession(req)
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const type = searchParams.get('type') // 'article', 'video', 'activity', or null for all
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('published_content')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by type if specified
    if (type && ['article', 'video', 'activity'].includes(type)) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Fetch published content error:', error)
      return NextResponse.json({ error: '获取内容失败', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (err: any) {
    const isAuthError = err.message.includes('Unauthorized');
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
