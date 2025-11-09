import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, getAdminWalletFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const addr = getAdminWalletFromRequest(request)
  const is = isAdmin(addr)
  return NextResponse.json({ isAdmin: is, address: addr })
}
