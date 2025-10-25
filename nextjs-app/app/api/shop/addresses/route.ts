import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('shop_addresses').select('*').eq('user_uid', uid).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const payload: any = {
    user_uid: uid,
    contact_name: body.contact_name,
    phone: body.phone,
    address_line1: body.address_line1,
    address_line2: body.address_line2 || null,
    city: body.city || null,
    state: body.state || null,
    postal_code: body.postal_code || null,
    country: body.country || null,
    is_default: !!body.is_default,
  }
  if (!payload.contact_name || !payload.phone || !payload.address_line1) {
    return NextResponse.json({ success: false, error: '请填写完整收货信息' }, { status: 400 })
  }
  if (payload.is_default) {
    await supabaseAdmin.from('shop_addresses').update({ is_default: false }).eq('user_uid', uid)
  }
  const { data, error } = await supabaseAdmin.from('shop_addresses').insert(payload).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { data: existing } = await supabaseAdmin.from('shop_addresses').select('id,user_uid').eq('id', id).maybeSingle()
  if (!existing || existing.user_uid !== uid) return NextResponse.json({ success: false, error: '未找到地址' }, { status: 404 })
  const updates: any = {}
  ;['contact_name','phone','address_line1','address_line2','city','state','postal_code','country','is_default'].forEach(k => {
    if (body[k] !== undefined) updates[k] = body[k]
  })
  if (updates.is_default === true) {
    await supabaseAdmin.from('shop_addresses').update({ is_default: false }).eq('user_uid', uid)
  }
  const { data, error } = await supabaseAdmin.from('shop_addresses').update(updates).eq('id', id).eq('user_uid', uid).select('*').single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('shop_addresses').delete().eq('id', id).eq('user_uid', uid)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
