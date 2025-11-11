import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'
import { invalidate } from '@/lib/revalidate'

// Helpers
function parseTags(input: any): string[] | null {
  if (!input) return null
  if (Array.isArray(input)) return input.map(String).map(t=>t.trim()).filter(Boolean).slice(0, 20)
  if (typeof input === 'string') {
    return input.split(',').map(t=>t.trim()).filter(Boolean).slice(0, 20)
  }
  return null
}

function validateVideoPayload(body: any, forUpdate = false) {
  const errors: string[] = []
  const out: any = {}
  if (!forUpdate) {
    if (!body.title) errors.push('缺少标题')
    if (!body.video_url && !body.external_url) errors.push('缺少视频外链或外部链接')
  }
  ;['title','content','image_url','video_url','external_url'].forEach(k => {
    if (body[k] !== undefined) out[k] = body[k]
  })
  if (body.tags !== undefined) out.tags = parseTags(body.tags)
  if (errors.length) return { errors }
  return { data: out }
}

export async function GET(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  let query = supabaseAdmin.from('published_content').select('*').eq('category', 'video')
  if (q) {
    const like = `%${q}%`
    query = query.or(`title.ilike.${like},content.ilike.${like}`)
  }
  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { data: payload, errors } = validateVideoPayload(body)
  if (errors) return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 })
  const now = new Date().toISOString()
  const insert: any = {
    category: 'video',
    title: payload.title,
    content: payload.content || '',
    image_url: payload.image_url || null,
    video_url: payload.video_url || null,
    external_url: payload.external_url || null,
    tags: payload.tags || [],
    published_at: now,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabaseAdmin.from('published_content').insert(insert).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  invalidate({ paths: ['/videos'], tags: ['videos'] })
  return NextResponse.json({ success: true, data })
}

export async function PUT(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { data: payload, errors } = validateVideoPayload(body, true)
  if (errors) return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 })
  const updates: any = { updated_at: new Date().toISOString() }
  Object.entries(payload).forEach(([k,v]) => { if (v !== undefined) updates[k] = v })
  const { data, error } = await supabaseAdmin.from('published_content').update(updates).eq('id', id).eq('category','video').select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  invalidate({ paths: ['/videos'], tags: ['videos'] })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('published_content').delete().eq('id', id).eq('category','video')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  invalidate({ paths: ['/videos'], tags: ['videos'] })
  return NextResponse.json({ success: true })
}
