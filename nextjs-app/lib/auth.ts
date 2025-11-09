// Admin wallets configured via env; used directly for authorization.
export const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map(addr => addr.trim().toLowerCase())
  .filter(Boolean)

export function isAdmin(address: string | undefined): boolean {
  if (!address) return false
  return ADMIN_WALLETS.includes(address.toLowerCase())
}

export function requireAdmin(address: string | undefined): void {
  if (!isAdmin(address)) {
    throw new Error('Unauthorized: Admin access required')
  }
}

// Extract admin wallet from request without cookie requirement.
// Priority order:
// 1. X-Admin-Wallet header
// 2. query param ?adminWallet=
// 3. legacy connected_wallet cookie (optional fallback)
export function getAdminWalletFromRequest(req: Request | { headers: Headers; cookies?: any }): string | undefined {
  try {
    const anyReq = req as any
    const queryUrl = anyReq?.url ? new URL(anyReq.url, 'http://local') : null
    const headerVal = anyReq?.headers?.get?.('x-admin-wallet') || anyReq?.headers?.get?.('X-Admin-Wallet')
    if (headerVal) return String(headerVal).toLowerCase()
    const qp = queryUrl?.searchParams?.get('adminWallet')
    if (qp) return qp.toLowerCase()
    // Optional fallback to cookie for backward compatibility
    const cookieStore = anyReq?.cookies
    if (cookieStore && typeof cookieStore.get === 'function') {
      const v = cookieStore.get('connected_wallet')?.value
      return v ? String(v).toLowerCase() : undefined
    }
    const cookieHeader = anyReq?.headers?.get?.('cookie') || ''
    if (cookieHeader) {
      const parts = cookieHeader.split(';')
      for (const p of parts) {
        const [k, ...rest] = p.trim().split('=')
        if (k === 'connected_wallet') {
          return decodeURIComponent(rest.join('=')).toLowerCase()
        }
      }
    }
  } catch {}
  return undefined
}

export function isAdminFromRequest(req: Request | { headers: Headers; cookies?: any }): boolean {
  const addr = getAdminWalletFromRequest(req)
  return isAdmin(addr)
}

export function requireAdminFromRequest(req: Request | { headers: Headers; cookies?: any }): void {
  const addr = getAdminWalletFromRequest(req)
  requireAdmin(addr)
}
