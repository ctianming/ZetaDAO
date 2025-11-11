import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Unified helpers to perform safe on-demand revalidation. Each helper catches
 * and swallows errors so that primary mutations don't fail due to revalidation.
 * Prefer using semantic tag names that map to data domains (e.g. 'videos', 'articles').
 */
export function safeRevalidatePath(path: string) {
  try { if (path) revalidatePath(path) } catch (e) { /* noop */ }
}

export function safeRevalidatePaths(paths: (string | null | undefined)[]) {
  for (const p of paths) { if (p) safeRevalidatePath(p) }
}

export function safeRevalidateTag(tag: string) {
  try { if (tag) revalidateTag(tag) } catch (e) { /* noop */ }
}

export function safeRevalidateTags(tags: (string | null | undefined)[]) {
  for (const t of tags) { if (t) safeRevalidateTag(t) }
}

/**
 * Convenience: invalidate both a set of paths and tags in one call.
 */
export function invalidate({ paths = [], tags = [] }: { paths?: (string | null | undefined)[]; tags?: (string | null | undefined)[] }) {
  safeRevalidatePaths(paths)
  safeRevalidateTags(tags)
}

/**
 * Optional: verify a revalidation secret if configured. If REVALIDATION_SECRET
 * is set, request must provide either header `x-revalidate-secret` matching the secret
 * or an Authorization: Bearer <secret> token. If no secret is set, returns false.
 */
export function verifyRevalidateSecret(req: Request | { headers: Headers }): boolean {
  const secret = process.env.REVALIDATION_SECRET
  if (!secret) return false
  try {
    const anyReq = req as any
    const h = anyReq?.headers
    const fromHeader = h?.get?.('x-revalidate-secret') || h?.get?.('X-Revalidate-Secret')
    if (fromHeader && String(fromHeader) === secret) return true
    const auth = h?.get?.('authorization') || h?.get?.('Authorization')
    if (auth && String(auth).toLowerCase().startsWith('bearer ')) {
      const token = String(auth).slice(7)
      return token === secret
    }
  } catch {}
  return false
}
