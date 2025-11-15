import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { isAdmin } from '@/lib/auth'

// Returns a nonce bound to the requested wallet (lowercased) via a httpOnly cookie.
// Client will sign a message containing this nonce with MetaMask.
export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json().catch(() => ({})) as { wallet?: string }
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ success: false, error: 'Invalid wallet' }, { status: 400 })
    }
    const lower = wallet.toLowerCase()
    if (!isAdmin(lower)) {
      // Do not reveal whitelist detail; generic error
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }
    const nonce = '0x' + crypto.randomBytes(16).toString('hex')
    const res = NextResponse.json({ success: true, nonce })
    // Bind nonce to wallet via cookie; short ttl (5 min). Replace previous if any.
    res.cookies.set(`admin_nonce_${lower}`, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 300,
    })
    return res
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
