import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { auth } from '@/auth'
import { SubmitContentForm } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: SubmitContentForm & { walletAddress?: string } = await request.json()
    const { walletAddress, title, content, category, tags, imageUrl, videoUrl, externalLink, articleCategory } = body

    // 解析 user_uid：优先 session，其次 identities(wallet)
    let userUid: string | null = null
    try {
      const session = await auth()
      userUid = (session as any)?.uid || null
    } catch {}
    if (!userUid && walletAddress) {
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'wallet')
        .eq('account_id', walletAddress.toLowerCase())
        .maybeSingle()
      userUid = ident?.user_uid || null
    }

    // 验证必填字段（至少需要 userUid 或 walletAddress 之一）
    if (!title || !content || !category || (!userUid && !walletAddress)) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 先尝试兼容旧列(wallet_address)；若列不存在则回退为仅 user_uid
    const baseInsert: any = {
      user_uid: userUid,
      title,
      content,
      category,
      status: 'pending',
      metadata: {
        tags: tags || [],
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        externalLink: externalLink || null,
        // Store article classification if provided
        articleCategory: articleCategory || null,
      },
    }

    // 如果提供了钱包地址，优先写入旧列以兼容旧库
    const tryWithWallet = walletAddress ? { ...baseInsert, wallet_address: walletAddress } : baseInsert

    let insertResp = await supabaseAdmin
      .from('submissions')
      .insert(tryWithWallet)
      .select()
      .single()

    // 若 wallet_address 列不存在（PostgREST PGRST204），重试去掉该列
    if (insertResp.error && (insertResp.error as any).code === 'PGRST204') {
      console.warn('wallet_address column missing on submissions, retrying without it')
      insertResp = await supabaseAdmin
        .from('submissions')
        .insert(baseInsert)
        .select()
        .single()
    }

    const { data, error } = insertResp

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json(
        { error: '提交失败，请重试' },
        { status: 500 }
      )
    }

    // 更新用户投稿计数（若解析到了 uid）
    if (userUid) {
      await supabaseAdmin.rpc('increment_user_submissions', { user_uid: userUid })
    }

    return NextResponse.json({
      success: true,
      data,
      message: '投稿成功，等待审核',
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
