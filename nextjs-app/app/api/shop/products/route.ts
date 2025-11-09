import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const includeInactive = url.searchParams.get('includeInactive') === '1'
  const query = supabaseAdmin.from('shop_products').select('*').order('created_at', { ascending: false })
  const { data, error } = includeInactive ? await query : await query.eq('status', 'active')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  if (!isAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const payload: any = {
    slug: body.slug,
    name: body.name,
    description: body.description || null,
    image_url: body.image_url || null,
    price_wei: body.price_wei,
    stock: body.stock ?? '0',
    status: body.status || 'inactive',
    metadata_uri: body.metadata_uri || null,
    onchain_id: body.onchain_id || null,
    last_synced_block: body.last_synced_block || null,
    created_at: now,
    updated_at: now,
  }
  if (!payload.slug || !payload.name || !payload.price_wei) {
    return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.from('shop_products').insert(payload).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PUT(req: NextRequest) {
  if (!isAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { data: existing } = await supabaseAdmin.from('shop_products').select('id').eq('id', id).maybeSingle()
  if (!existing) return NextResponse.json({ success: false, error: '未找到商品' }, { status: 404 })
  const updates: any = { updated_at: new Date().toISOString() }
  ;['slug','name','description','image_url','price_wei','stock','status','metadata_uri','onchain_id','last_synced_block'].forEach(k => {
    if (body[k] !== undefined) updates[k] = body[k]
  })
  const { data, error } = await supabaseAdmin.from('shop_products').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('shop_products').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
