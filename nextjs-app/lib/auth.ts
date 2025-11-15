// Session-only admin auth utilities (legacy header/query method removed).
// Configure a comma-separated list of admin wallet addresses in ADMIN_WALLETS.
import { admin as adminConfig } from './env'

export const ADMIN_WALLETS = adminConfig.wallets
const ADMIN_WALLETS_SET = new Set(ADMIN_WALLETS)

export function isAdmin(address: string | undefined): boolean {
  return !!(address && ADMIN_WALLETS_SET.has(address.toLowerCase()))
}

export function requireAdmin(address: string | undefined): void {
  if (!isAdmin(address)) throw new Error('Unauthorized: Admin access required')
}

// ---- Admin session (signed cookie) ----
import crypto from 'crypto'
const ADMIN_SESSION_SECRET = adminConfig.sessionSecret
const ADMIN_SESSION_COOKIE = 'admin_session'

// In-memory revocation list (for production, use Redis or database)
// Maps JTI (token ID) to revocation timestamp
const revokedTokens = new Map<string, number>()

// Clean up old revoked tokens periodically (older than 2 hours)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000
    for (const [jti, timestamp] of revokedTokens.entries()) {
      if (timestamp < cutoff) revokedTokens.delete(jti)
    }
  }, 10 * 60 * 1000) // Run every 10 minutes
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64urlDecode(str: string) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad) str += '='.repeat(4 - pad)
  return Buffer.from(str, 'base64').toString('utf8')
}

export function createAdminSessionToken(address: string, ttlSec = 3600) {
  const payload = { w: address.toLowerCase(), exp: Math.floor(Date.now() / 1000) + ttlSec, jti: crypto.randomUUID() }
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(body).digest('base64url')
  return `v1.${body}.${sig}`
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) return null as string | null
  const [ver, body, sig] = token.split('.')
  if (ver !== 'v1' || !body || !sig) return null
  const expected = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(body).digest('base64url')
  if (expected.length !== sig.length) return null
  try { crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) } catch { return null }
  let payload: any
  try { payload = JSON.parse(b64urlDecode(body)) } catch { return null }
  if (!payload?.w || !payload?.exp || !payload?.jti) return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  
  // Check if token has been revoked
  if (revokedTokens.has(payload.jti)) return null
  
  return String(payload.w)
}

/**
 * Revoke a session token by its JTI (token ID)
 * This allows immediate invalidation without waiting for expiration
 */
export function revokeAdminSessionToken(jti: string) {
  revokedTokens.set(jti, Date.now())
}

/**
 * Revoke all sessions for a specific wallet address
 * Note: This only works for tokens issued after this mechanism was added
 */
export function revokeAllSessionsForWallet(address: string) {
  // In a production system, you'd query all active sessions from database
  // For now, this is a placeholder that would need database integration
  console.log(`[Auth] Revoke all sessions requested for wallet: ${address}`)
  // TODO: Implement database-backed session tracking
}

export function getAdminWalletFromSession(req: Request | { headers: Headers; cookies?: any }) {
  try {
    const anyReq = req as any
    let token: string | undefined
    if (anyReq?.cookies?.get?.(ADMIN_SESSION_COOKIE)?.value) token = anyReq.cookies.get(ADMIN_SESSION_COOKIE).value
    if (!token) {
      const cookieHeader: string | undefined = anyReq?.headers?.get?.('cookie')
      if (cookieHeader) {
        const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(`${ADMIN_SESSION_COOKIE}=`))
        if (match) token = match.split('=')[1]
      }
    }
    return verifyAdminSessionToken(token) || undefined
  } catch { return undefined }
}

export function isAdminFromSession(req: Request | { headers: Headers; cookies?: any }) {
  return isAdmin(getAdminWalletFromSession(req))
}
export function requireAdminFromSession(req: Request | { headers: Headers; cookies?: any }) {
  requireAdmin(getAdminWalletFromSession(req))
}
