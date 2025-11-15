import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, type Address, type Hex } from 'viem'
import { createAdminSessionToken, isAdmin } from '@/lib/auth'
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit'

// Audit log helper
function logAdminAuth(address: string, success: boolean, reason?: string, ip?: string) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] Admin auth attempt: ${address} | Success: ${success} | Reason: ${reason || 'N/A'} | IP: ${ip || 'unknown'}`
  console.log(logEntry)
  // TODO: Consider persisting to database for long-term audit trail
}

// Temporary mode: allow address-only admin verification when
// ADMIN_ALLOW_NO_SIGN=true is set in server env. This is intended as a
// short-term rollback (no signature required) and should be reverted.
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
  
  try {
    const { address, message, signature } = await req.json().catch(() => ({})) as { address?: string; message?: string; signature?: string }
    if (!address) return NextResponse.json({ success: false, error: 'Missing address' }, { status: 400 })
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 })
    const lower = address.toLowerCase()
    
    // Rate limiting: 5 attempts per 15 minutes per IP + wallet combination
    const rateLimitKey = `admin_auth:${clientIp}:${lower}`
    const rateLimit = checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 })
    
    if (!rateLimit.allowed) {
      const resetInMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000)
      logAdminAuth(lower, false, `Rate limit exceeded (resets in ${resetInMinutes}m)`, clientIp)
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many authentication attempts. Please try again in ${resetInMinutes} minute(s).`,
          resetAt: rateLimit.resetAt
        }, 
        { status: 429 }
      )
    }

    const allowNoSign = String(process.env.ADMIN_ALLOW_NO_SIGN || '').toLowerCase() === 'true'
    // Fast path: if feature-flag enabled, accept address-only and issue session
    if (allowNoSign) {
      if (!isAdmin(lower)) {
        logAdminAuth(lower, false, 'Not in admin whitelist (no-sign mode)', clientIp)
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      }
      logAdminAuth(lower, true, 'No-sign mode enabled', clientIp)
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
    if (!nonceCookie) {
      return NextResponse.json({ success: false, error: 'Expired or invalid nonce' }, { status: 400 })
    }
    
    // Parse nonce data with timestamp validation
    let nonceData: { nonce: string; timestamp: number; expiresAt: number }
    try {
      nonceData = JSON.parse(nonceCookie)
      if (!nonceData.nonce || !nonceData.timestamp || !nonceData.expiresAt) {
        throw new Error('Invalid nonce data structure')
      }
    } catch {
      // Fallback: treat as legacy plain nonce string
      nonceData = { nonce: nonceCookie, timestamp: Date.now() - 60000, expiresAt: Date.now() + 240000 }
    }
    
    // Validate nonce expiration
    if (Date.now() > nonceData.expiresAt) {
      logAdminAuth(lower, false, 'Nonce expired', clientIp)
      return NextResponse.json({ success: false, error: 'Nonce expired' }, { status: 400 })
    }
    
    // Strict nonce validation: must match exactly and be in the expected format
    const expectedMessage = `Admin access to ZetaDAO\n\nNonce: ${nonceData.nonce}\nTimestamp: ${nonceData.timestamp}\nExpires: ${nonceData.expiresAt}`

    if (message !== expectedMessage) {
      logAdminAuth(lower, false, 'Message format mismatch', clientIp)
      // For debugging, log the difference
      console.error('Message Mismatch:', { expected: expectedMessage, received: message });
      return NextResponse.json({ success: false, error: 'Message format mismatch' }, { status: 400 })
    }
    
    // Verify signature
    const ok = await verifyMessage({ address: lower as Address, message, signature: signature as Hex })
    if (!ok) {
      logAdminAuth(lower, false, 'Signature verification failed', clientIp)
      return NextResponse.json({ success: false, error: 'Signature verification failed' }, { status: 400 })
    }
    
    // Check admin status
    if (!isAdmin(lower)) {
      logAdminAuth(lower, false, 'Not in admin whitelist', clientIp)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }
    
    // Success - log and issue session
    logAdminAuth(lower, true, 'Signature verified', clientIp)
    
    // Reset rate limit on successful authentication
    resetRateLimit(rateLimitKey)
    
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
    console.error('[Admin Auth] Unexpected error:', e)
    logAdminAuth('unknown', false, `Server error: ${(e as Error).message}`, clientIp)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
