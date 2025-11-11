import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, getAdminWalletFromSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const addrFromSession = getAdminWalletFromSession(request)
  return NextResponse.json({ isAdmin: isAdmin(addrFromSession), address: addrFromSession, via: 'session' })
}
