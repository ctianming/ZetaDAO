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
