import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { requireAdminFromSession, getAdminWalletFromSession } from '@/lib/auth'
import { invalidate } from '@/lib/revalidate'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（基于已验证的连接钱包 Cookie）
    try {
      requireAdminFromSession(request)
    } catch (error) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
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

    let authorUid: string | null = submission.user_uid || null
    if (!authorUid && submission.wallet_address) {
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'wallet')
        .eq('account_id', submission.wallet_address.toLowerCase())
        .maybeSingle()
      authorUid = ident?.user_uid || null
    }

    let authorName: string | null = null
    if (authorUid) {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('username')
        .eq('uid', authorUid)
        .maybeSingle()
      authorName = userProfile?.username || null
    }

    // 更新投稿状态为已批准（兼容两套列：reviewed_by 与 reviewed_by_uid）
  const reviewerWallet = getAdminWalletFromSession(request)
    let updateErr: any = null
    {
      const { error } = await supabaseAdmin
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerWallet || null,
          blockchain_hash: blockchainHash || null,
        } as any)
        .eq('id', submissionId)
      updateErr = error
    }
    if (updateErr && (updateErr as any).code === 'PGRST204') {
      // 列不存在：回退为 reviewed_by_uid（若能解析到）或不写 reviewer
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
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        blockchain_hash: blockchainHash || null,
      }
      if (reviewerUid) updates.reviewed_by_uid = reviewerUid
      const { error } = await supabaseAdmin
        .from('submissions')
        .update(updates)
        .eq('id', submissionId)
      updateErr = error
    }
    if (updateErr) throw updateErr

    // 发布内容到 published_content 表
    const { data: published, error: publishError } = await supabaseAdmin
      .from('published_content')
      .insert({
        submission_id: submissionId,
        title: submission.title,
        content: submission.content,
        category: submission.category,
        author_wallet: submission.wallet_address,
        author_uid: authorUid,
        author_name: authorName,
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
        actor_wallet: reviewerWallet || null,
        target_type: 'submission',
        target_id: submissionId,
        metadata: { blockchain_hash: blockchainHash },
      })

    // 按类别触发相关页面的按需再验证
    try {
      const cat = String(submission.category || '')
      if (cat === 'activity') invalidate({ paths: ['/activities'] })
      if (cat === 'article') {
        const contentPath = published?.id ? `/articles/${published.id}` : null
        invalidate({ paths: ['/articles', contentPath] })
      }
      if (cat === 'video') invalidate({ paths: ['/videos'], tags: ['videos'] })
    } catch {}

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
