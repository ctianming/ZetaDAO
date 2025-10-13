import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const res = NextResponse.json({ nonce })
  res.cookies.set('wallet_nonce', nonce, { httpOnly: true, sameSite: 'lax', maxAge: 300 })
  return res
}
