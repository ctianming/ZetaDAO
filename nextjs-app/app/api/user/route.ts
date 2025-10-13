import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = (searchParams.get('wallet') || '').toLowerCase()
  if (!wallet) return NextResponse.json({ error: '缺少钱包地址' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('users').select('wallet_address,username,avatar_url,bio,role,metadata').eq('wallet_address', wallet).single()
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: '查询失败' }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const walletAddress = (body?.walletAddress || '').toLowerCase()
    const username = body?.username
    if (!walletAddress) return NextResponse.json({ error: '缺少钱包地址' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({ wallet_address: walletAddress, username }, { onConflict: 'wallet_address' })
      .select('wallet_address,username')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
