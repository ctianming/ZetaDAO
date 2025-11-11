import { NextRequest, NextResponse } from 'next/server'
import { isAdminFromSession } from '@/lib/auth'
import { invalidate, verifyRevalidateSecret } from '@/lib/revalidate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { paths?: string[]; tags?: string[] }
    const paths = Array.isArray(body.paths) ? body.paths.filter(Boolean) : []
    const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : []

    // Allow either a signed secret OR a valid admin session.
    const hasSecret = verifyRevalidateSecret(req)
    const hasSession = isAdminFromSession(req)
    if (!hasSecret && !hasSession) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    invalidate({ paths, tags })
    return NextResponse.json({ success: true, revalidated: { paths, tags } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
