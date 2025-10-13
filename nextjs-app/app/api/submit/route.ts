import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { SubmitContentForm } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: SubmitContentForm & { walletAddress: string } = await request.json()
    
  const { walletAddress, title, content, category, tags, imageUrl, videoUrl, externalLink, articleCategory } = body

    // 验证必填字段
    if (!walletAddress || !title || !content || !category) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 插入投稿数据
  const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert({
        wallet_address: walletAddress,
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
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json(
        { error: '提交失败，请重试' },
        { status: 500 }
      )
    }

    // 更新用户投稿计数
  await supabaseAdmin.rpc('increment_user_submissions', {
      user_wallet: walletAddress,
    })

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
