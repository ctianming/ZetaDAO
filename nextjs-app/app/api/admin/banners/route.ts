import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'
import { invalidate } from '@/lib/revalidate'

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch all banners (including inactive ones for admin)
export async function GET(req: NextRequest) {
  try {
    requireAdminFromSession(req)

    const { data, error } = await supabaseAdmin
      .from('homepage_banners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch banners error:', error)
      return NextResponse.json({ error: '获取横幅失败', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })

  } catch (err: any) {
    const isAuthError = err.message.includes('Unauthorized');
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}

// POST - Create a new banner
export async function POST(req: NextRequest) {
  try {
    requireAdminFromSession(req)

    const body = await req.json()
    const { content, link_url, status, start_at, end_at } = body

    if (!content) {
      return NextResponse.json({ error: '横幅内容不能为空' }, { status: 400 })
    }

    // Validate dates if provided
    if (start_at && end_at && new Date(start_at) >= new Date(end_at)) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('homepage_banners')
      .insert({
        content,
        link_url: link_url || null,
        status: status || 'inactive',
        start_at: start_at || null,
        end_at: end_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create banner error:', error)
      return NextResponse.json({ error: '创建横幅失败', details: error.message }, { status: 500 })
    }

    // Invalidate homepage cache
    invalidate({ paths: ['/'], tags: ['banners'] })

    return NextResponse.json({ success: true, data })

  } catch (err: any) {
    const isAuthError = err.message.includes('Unauthorized');
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
