import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'
import { invalidate } from '@/lib/revalidate'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdminFromSession(req)
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: '缺少内容 ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('published_content')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete published content error:', error)
      return NextResponse.json({ error: '数据库删除失败', details: error.message }, { status: 500 })
    }

    // Invalidate relevant caches
    invalidate({ paths: ['/', '/articles', '/videos', '/activities'], tags: ['content'] })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    const isAuthError = err.message === 'Unauthorized'
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}

