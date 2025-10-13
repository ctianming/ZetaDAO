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

    const { submissionId, blockchainHash } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: '缺少投稿ID' },
        { status: 400 }
      )
    }

    // 获取投稿信息
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: '投稿不存在' },
        { status: 404 }
      )
    }

    // 更新投稿状态为已批准
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: walletAddress,
        blockchain_hash: blockchainHash || null,
      })
      .eq('id', submissionId)

    if (updateError) {
      throw updateError
    }

    // 发布内容到 published_content 表
  const { data: published, error: publishError } = await supabaseAdmin
      .from('published_content')
      .insert({
        submission_id: submissionId,
        title: submission.title,
        content: submission.content,
        category: submission.category,
        author_wallet: submission.wallet_address,
    metadata: submission.metadata,
    // persist tags in column for faster filter
    tags: Array.isArray(submission.metadata?.tags) ? submission.metadata.tags : [],
    // for articles, persist classification
    article_category: submission.metadata?.articleCategory || null,
      })
      .select()
      .single()

    if (publishError) {
      throw publishError
    }

    // 更新用户的审核通过计数
    await supabaseAdmin.rpc('increment_approved_submissions', {
      user_wallet: submission.wallet_address,
    })

    // 记录审计日志
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'approve_submission',
        actor_wallet: walletAddress,
        target_type: 'submission',
        target_id: submissionId,
        metadata: { blockchain_hash: blockchainHash },
      })

    return NextResponse.json({
      success: true,
      data: published,
      message: '审核通过，内容已发布',
    })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: '审核失败' },
      { status: 500 }
    )
  }
}
