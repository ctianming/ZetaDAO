// Session-only admin auth utilities (legacy header/query method removed).
// Configure a comma-separated list of admin wallet addresses in ADMIN_WALLETS.
export const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map(a => a.trim().toLowerCase())
  .filter(Boolean)

const ADMIN_WALLETS_SET = new Set(ADMIN_WALLETS)

export function isAdmin(address: string | undefined): boolean {
  return !!(address && ADMIN_WALLETS_SET.has(address.toLowerCase()))
}

export function requireAdmin(address: string | undefined): void {
  if (!isAdmin(address)) throw new Error('Unauthorized: Admin access required')
}

// ---- Admin session (signed cookie) ----
import crypto from 'crypto'
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SIGNING_KEY || 'dev-admin-secret'
const ADMIN_SESSION_COOKIE = 'admin_session'

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
  if (!payload?.w || !payload?.exp) return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return String(payload.w)
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
