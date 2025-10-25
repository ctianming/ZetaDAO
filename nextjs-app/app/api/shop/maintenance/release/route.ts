import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const admin = req.headers.get('x-wallet-address') || undefined
  if (!isAdmin(admin)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin.rpc('shop_release_expired')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: { released: data || 0 } })
}

export async function GET(req: NextRequest) {
  // convenience GET for manual triggering
  return POST(req)
}
