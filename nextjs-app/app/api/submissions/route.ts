import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { mapSubmissionRows } from '@/lib/transform'

// 获取投稿列表（Admin专用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const walletAddress = request.headers.get('x-wallet-address')

    // 如果是管理员，可以查看所有投稿
    if (isAdmin(walletAddress || undefined)) {
      const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('status', status)
        .order('submitted_at', { ascending: false })

      if (error) {
        throw error
      }

  return NextResponse.json({ success: true, data: mapSubmissionRows(data) })
    }

    // 普通用户只能查看自己的投稿
    if (!walletAddress) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('submitted_at', { ascending: false })

    if (error) {
      throw error
    }

  return NextResponse.json({ success: true, data: mapSubmissionRows(data) })
  } catch (error) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    )
  }
}
