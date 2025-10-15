import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

// Upload images for article content; returns public URL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type 必须为 multipart/form-data' }, { status: 400 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: '缺少文件' }, { status: 400 })

    // Validate type & size
    const allowed = (process.env.IMAGE_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp')
      .split(',').map(t => t.trim()).filter(Boolean)
    const maxMB = parseInt(process.env.CONTENT_IMAGE_MAX_MB || '5', 10)
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: `不支持的图片类型: ${file.type}` }, { status: 400 })
    }
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json({ error: `图片过大，最大支持 ${maxMB}MB` }, { status: 413 })
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
    const filename = `content_${s.uid}_${Date.now()}_${(file as any).name || 'image'}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: up, error: upErr } = await (supabaseAdmin as any).storage
      .from(bucket)
      .upload(filename, buffer, { contentType: file.type || 'image/png', upsert: true })
    if (upErr) return NextResponse.json({ error: `上传失败: ${upErr.message}` }, { status: 500 })

    const base = process.env.NEXT_PUBLIC_APP_URL || ''
    const proxyUrl = `${base.replace(/\/$/, '')}/api/storage/file?path=${encodeURIComponent(up.path)}`

    return NextResponse.json({ success: true, url: proxyUrl, path: up.path })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
