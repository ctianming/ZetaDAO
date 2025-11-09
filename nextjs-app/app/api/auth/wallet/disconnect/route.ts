import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth/wallet/disconnect
// clears the connected wallet cookie
export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true })
  res.cookies.set('connected_wallet', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return res
}
