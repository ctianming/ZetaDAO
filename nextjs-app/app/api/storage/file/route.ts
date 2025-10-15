export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

// GET /api/storage/file?path=...
// Generates a short-lived signed URL for a private Supabase Storage file and redirects.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = (searchParams.get('path') || '').trim()
    if (!path) return NextResponse.json({ error: '缺少 path' }, { status: 400 })
    // Basic path validation: disallow traversal
    if (path.includes('..')) return NextResponse.json({ error: '非法路径' }, { status: 400 })

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
    const expiresIn = parseInt(process.env.SUPABASE_SIGNED_URL_TTL || '3600', 10)

    const { data, error } = (supabaseAdmin as any).storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error || !data?.signedUrl) return NextResponse.json({ error: '生成签名地址失败' }, { status: 500 })

    return NextResponse.redirect(data.signedUrl, { status: 307 })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
