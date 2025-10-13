import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const wallet = request.headers.get('x-wallet-address') || undefined
  const ok = isAdmin(wallet)
  return NextResponse.json({ isAdmin: ok })
}
