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

    // 发表奖励 XP：50xp 给作者
    try {
      let authorUid: string | null = submission.user_uid || null
      if (!authorUid && submission.wallet_address) {
        const { data: ident } = await supabaseAdmin
          .from('user_identities')
          .select('user_uid')
          .eq('provider', 'wallet')
          .eq('account_id', submission.wallet_address)
          .maybeSingle()
        authorUid = ident?.user_uid || null
      }
      if (authorUid) {
        await supabaseAdmin.from('xp_events').insert({
          user_uid: authorUid,
          type: 'publish',
          amount: 50,
          submission_id: submissionId,
          metadata: { source: 'approve_api' },
        })
      }
    } catch (e) {
      console.warn('Failed to award publish XP:', e)
    }

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
