import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { requireAdminFromSession, getAdminWalletFromSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（基于已验证的连接钱包 Cookie）
    try {
      requireAdminFromSession(request)
    } catch (error) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const { submissionId, reason } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: '缺少投稿ID' },
        { status: 400 }
      )
    }

    // 更新投稿状态为已拒绝（兼容 reviewed_by 与 reviewed_by_uid）
  const reviewerWallet = getAdminWalletFromSession(request)
    let rejectErr: any = null
    {
      const { error } = await supabaseAdmin
        .from('submissions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerWallet || null,
          metadata: {
            reject_reason: reason || '不符合发布标准',
          },
        } as any)
        .eq('id', submissionId)
      rejectErr = error
    }
    if (rejectErr && (rejectErr as any).code === 'PGRST204') {
      let reviewerUid: string | null = null
      if (reviewerWallet) {
        const { data: ident } = await supabaseAdmin
          .from('user_identities')
          .select('user_uid')
          .eq('provider', 'wallet')
          .eq('account_id', reviewerWallet.toLowerCase())
          .maybeSingle()
        reviewerUid = ident?.user_uid || null
      }
      const updates: Record<string, any> = {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        metadata: { reject_reason: reason || '不符合发布标准' },
      }
      if (reviewerUid) updates.reviewed_by_uid = reviewerUid
      const { error } = await supabaseAdmin
        .from('submissions')
        .update(updates)
        .eq('id', submissionId)
      rejectErr = error
    }
    if (rejectErr) throw rejectErr

    // 记录审计日志
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'reject_submission',
        actor_wallet: reviewerWallet || null,
        target_type: 'submission',
        target_id: submissionId,
        metadata: { reason },
      })

    return NextResponse.json({
      success: true,
      message: '已拒绝该投稿',
    })
  } catch (error) {
    console.error('Reject error:', error)
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    )
  }
}
