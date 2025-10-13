import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address')
    
    // 验证管理员权限
    try {
      requireAdmin(walletAddress || undefined)
    } catch (error) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const { submissionId, reason } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: '缺少投稿ID' },
        { status: 400 }
      )
    }

    // 更新投稿状态为已拒绝
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: walletAddress,
        metadata: {
          reject_reason: reason || '不符合发布标准',
        },
      })
      .eq('id', submissionId)

    if (error) {
      throw error
    }

    // 记录审计日志
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'reject_submission',
        actor_wallet: walletAddress,
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
