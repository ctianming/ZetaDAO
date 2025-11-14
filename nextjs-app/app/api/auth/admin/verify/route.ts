import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, type Address, type Hex } from 'viem'
import { createAdminSessionToken, isAdmin } from '@/lib/auth'

// Temporary mode: allow address-only admin verification when
// ADMIN_ALLOW_NO_SIGN=true is set in server env. This is intended as a
// short-term rollback (no signature required) and should be reverted.
export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json().catch(() => ({})) as { address?: string; message?: string; signature?: string }
    if (!address) return NextResponse.json({ success: false, error: 'Missing address' }, { status: 400 })
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 })
    const lower = address.toLowerCase()

    const allowNoSign = String(process.env.ADMIN_ALLOW_NO_SIGN || '').toLowerCase() === 'true'
    // Fast path: if feature-flag enabled, accept address-only and issue session
    if (allowNoSign) {
      if (!isAdmin(lower)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      const token = createAdminSessionToken(lower)
      const res = NextResponse.json({ success: true, wallet: lower, note: 'admin_allow_no_sign' })
      res.cookies.set('admin_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
      })
      return res
    }

    // Normal flow (signature required)
    if (!message || !signature) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
    // Read nonce cookie bound to this wallet
    const nonceCookie = req.cookies.get(`admin_nonce_${lower}`)?.value
    if (!nonceCookie || !message.includes(nonceCookie)) {
      return NextResponse.json({ success: false, error: 'Expired or invalid nonce' }, { status: 400 })
    }
    const ok = await verifyMessage({ address: lower as Address, message, signature: signature as Hex })
    if (!ok) return NextResponse.json({ success: false, error: 'Signature verification failed' }, { status: 400 })
    if (!isAdmin(lower)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    const token = createAdminSessionToken(lower)
    const res = NextResponse.json({ success: true, wallet: lower })
    // Set short-lived admin session; can be refreshed by re-verifying
    res.cookies.set('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60, // 1h
    })
    // Clear nonce cookie
    res.cookies.set(`admin_nonce_${lower}`, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
    return res
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
