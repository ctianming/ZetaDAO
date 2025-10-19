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
    if (path.includes('..')) return NextResponse.json({ error: '非法路径' }, { status: 400 })

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'

    // Download file from Supabase Storage and stream to client (avoid cross-origin redirects)
    const { data: blob, error } = await (supabaseAdmin as any).storage
      .from(bucket)
      .download(path)
    if (error) {
      const msg = String((error as any)?.message || '')
      if (/not found|No such file|Object not found/i.test(msg)) {
        return NextResponse.json({ error: '文件不存在' }, { status: 404 })
      }
      return NextResponse.json({ error: '读取文件失败', detail: msg }, { status: 500 })
    }

    // Determine content type
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const typeFromBlob = (blob as Blob).type
    const type = typeFromBlob || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'application/octet-stream')
    const ab = await (blob as Blob).arrayBuffer()
    const fileName = path.split('/').pop() || 'file'

    return new Response(Buffer.from(ab), {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误', detail: (e as any)?.message || String(e) }, { status: 500 })
  }
}
