import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'
import { invalidate } from '@/lib/revalidate'

// PUT - Update a banner
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdminFromSession(req)
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: '缺少横幅 ID' }, { status: 400 })
    }

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
      .update({
        content,
        link_url: link_url || null,
        status: status || 'inactive',
        start_at: start_at || null,
        end_at: end_at || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update banner error:', error)
      return NextResponse.json({ error: '更新横幅失败', details: error.message }, { status: 500 })
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

// DELETE - Delete a banner
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdminFromSession(req)
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: '缺少横幅 ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('homepage_banners')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete banner error:', error)
      return NextResponse.json({ error: '删除横幅失败', details: error.message }, { status: 500 })
    }

    // Invalidate homepage cache
    invalidate({ paths: ['/'], tags: ['banners'] })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    const isAuthError = err.message.includes('Unauthorized');
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
