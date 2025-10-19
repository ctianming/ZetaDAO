import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

// Accepts multipart/form-data with 'file' and optional 'filename'
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
  const filename = (form.get('filename') as string) || `avatar_${Date.now()}.png`
    if (!file) return NextResponse.json({ error: '缺少文件' }, { status: 400 })

    // Validate type & size
    const allowed = (process.env.IMAGE_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp')
      .split(',').map(t => t.trim()).filter(Boolean)
    const maxMB = parseInt(process.env.AVATAR_MAX_MB || '3', 10)
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: `不支持的图片类型: ${file.type}` }, { status: 400 })
    }
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json({ error: `图片过大，最大支持 ${maxMB}MB` }, { status: 413 })
    }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
  const key = `${s.uid}/${filename}`
    const { data: up, error: upErr } = await (supabaseAdmin as any).storage
      .from(bucket)
      .upload(key, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      })
    if (upErr) return NextResponse.json({ error: `上传失败: ${upErr.message}` }, { status: 500 })

  // Build proxy URL for private bucket access via signed URL
  const proxyUrl = `/api/storage/file?path=${encodeURIComponent(key)}`

    // Save to users.avatar_url
    const { error: updErr } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: proxyUrl })
      .eq('uid', s.uid)
    if (updErr) return NextResponse.json({ error: '更新用户头像失败' }, { status: 500 })

  return NextResponse.json({ success: true, url: proxyUrl, path: key })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
