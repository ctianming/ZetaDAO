import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { db as dbEnv } from '@/lib/env'

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session as any)?.uid

  if (!uid) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 })
    }

    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只允许上传图片文件' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return NextResponse.json({ error: '文件大小不能超过 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const key = `article-covers/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bucket = dbEnv.storageBucket || 'default-bucket'

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: '上传到存储失败' }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(uploadData.path)

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl })

  } catch (e: any) {
    console.error('Image upload error:', e)
    return NextResponse.json({ error: '服务器错误', detail: e.message }, { status: 500 })
  }
}
