import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'

function validateAmbassador(body: any, forUpdate = false) {
  const errors: string[] = []
  const out: any = {}
  if (!forUpdate) {
    if (!body.name) errors.push('缺少名字')
  }
  ;['name','bio','avatar','twitter','telegram','discord','region','country','city','status'].forEach(k => {
    if (body[k] !== undefined) out[k] = body[k]
  })
  if (body.contributions !== undefined) out.contributions = Number(body.contributions) || 0
  if (body.events_hosted !== undefined) out.events_hosted = Number(body.events_hosted) || 0
  if (errors.length) return { errors }
  return { data: out }
}

export async function GET(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const country = url.searchParams.get('country')?.trim()
  const status = url.searchParams.get('status')?.trim()
  let query = supabaseAdmin.from('ambassadors').select('*')
  if (q) {
    const like = `%${q}%`
    query = query.or(`name.ilike.${like},bio.ilike.${like}`)
  }
  if (country) query = query.eq('country', country)
  if (status) query = query.eq('status', status)
  const { data, error } = await query.order('contributions', { ascending: false }).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { data: payload, errors } = validateAmbassador(body)
  if (errors) return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 })
  const now = new Date().toISOString()
  const insert: any = {
    name: payload.name,
    bio: payload.bio || '',
    avatar: payload.avatar || null,
    twitter: payload.twitter || null,
    telegram: payload.telegram || null,
    discord: payload.discord || null,
    region: payload.region || null,
    country: payload.country || null,
    city: payload.city || null,
    contributions: payload.contributions || 0,
    events_hosted: payload.events_hosted || 0,
    status: payload.status || 'active',
    created_at: now,
    updated_at: now,
    joined_at: now,
  }
  const { data, error } = await supabaseAdmin.from('ambassadors').insert(insert).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PUT(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { data: payload, errors } = validateAmbassador(body, true)
  if (errors) return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 })
  const updates: any = { updated_at: new Date().toISOString() }
  Object.entries(payload).forEach(([k,v]) => { if (v !== undefined) updates[k] = v })
  const { data, error } = await supabaseAdmin.from('ambassadors').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('ambassadors').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
