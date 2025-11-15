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

    // First, get the submission_id to update the original submission status if needed
    const { data: content } = await supabaseAdmin
      .from('published_content')
      .select('submission_id')
      .eq('id', id)
      .single();

    // Delete the published content
    const { error: deleteError } = await supabaseAdmin
      .from('published_content')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete published content error:', deleteError)
      return NextResponse.json({ error: '数据库删除失败', details: deleteError.message }, { status: 500 })
    }

    // Optional: Revert the status of the original submission to 'pending'
    if (content?.submission_id) {
      await supabaseAdmin
        .from('submissions')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', content.submission_id);
    }

    // Invalidate relevant caches to reflect the change on the frontend
    invalidate({ paths: ['/', '/articles', '/videos', '/activities'], tags: ['content'] })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    const isAuthError = err.message.includes('Unauthorized');
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
