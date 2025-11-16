import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: '缺少文件' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const key = `posts/${s.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'

    const { error } = await (supabaseAdmin as any).storage.from(bucket).upload(key, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })
    if (error) return NextResponse.json({ error: '上传失败' }, { status: 500 })

    // Return a proxy URL for private bucket access via signed URL
    // Use absolute URL to ensure compatibility with all contexts
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (req.headers.get('x-forwarded-proto') ? 
                      `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}` : 
                      `http://${req.headers.get('host')}`)
    const publicUrl = `${baseUrl}/api/storage/file?path=${encodeURIComponent(key)}`
    return NextResponse.json({ success: true, url: publicUrl, path: key })
  } catch (e) {
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
