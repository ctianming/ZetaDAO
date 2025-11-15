export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db'
import { isAdminFromSession, getAdminWalletFromSession } from '@/lib/auth'
import { mapSubmissionRows } from '@/lib/transform'
import { auth } from '@/auth'

// 获取投稿列表（Admin专用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const connectedWallet = getAdminWalletFromSession(request)

    // 如果是管理员，可以查看所有投稿
  if (isAdminFromSession(request)) {
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
    // 普通用户：优先使用 session uid 过滤；若未登录但已连接钱包，则用 legacy wallet_address 过滤；否则 401
    let userUid: string | null = null
    try {
      const session = await auth()
      userUid = (session as any)?.uid || null
    } catch {}

    let data: any[] | null = null
    let error: any = null
    if (userUid) {
      const resp = await supabase
        .from('submissions')
        .select('*')
        .eq('user_uid', userUid)
        .order('submitted_at', { ascending: false })
      data = resp.data as any[] | null
      error = resp.error
  } else if (connectedWallet) {
      // 新库可能已经移除 wallet_address 列；优先通过身份映射到 user_uid
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'wallet')
        .eq('account_id', connectedWallet.toLowerCase())
        .maybeSingle()
      if (ident?.user_uid) {
        const resp = await supabase
          .from('submissions')
          .select('*')
          .eq('user_uid', ident.user_uid)
          .order('submitted_at', { ascending: false })
        data = resp.data as any[] | null
        error = resp.error
      } else {
        // 兼容旧列：尝试 wallet_address 查询，若列不存在则忽略
        const resp = await supabase
          .from('submissions')
          .select('*')
          .eq('wallet_address', connectedWallet)
          .order('submitted_at', { ascending: false })
        if (resp.error && (resp.error as any).code === 'PGRST204') {
          console.warn('wallet_address column missing when fetching submissions; returning empty list')
          data = []
          error = null
        } else {
          data = resp.data as any[] | null
          error = resp.error
        }
      }
    } else {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

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
