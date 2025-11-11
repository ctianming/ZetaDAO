import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const ambassadorId = url.searchParams.get('ambassador_id')
  if (!ambassadorId) return NextResponse.json({ success: false, error: '缺少 ambassador_id' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('ambassadors').select('id, metadata').eq('id', ambassadorId).single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  const items = (data?.metadata?.manual_contributions || []) as any[]
  return NextResponse.json({ success: true, data: items })
}

export async function POST(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const ambassador_id = String(body.ambassador_id || '')
  const title = String(body.title || '')
  const detail = body.detail ? String(body.detail) : undefined
  const points = Number(body.points || 0)
  if (!ambassador_id || !title) return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 })

  // Load existing metadata
  const { data: row, error } = await supabaseAdmin.from('ambassadors').select('id, metadata, contributions').eq('id', ambassador_id).single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const now = new Date().toISOString()
  const item = { id: randomUUID(), ambassador_id, title, detail, points, created_at: now }
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const list = Array.isArray(metadata.manual_contributions) ? metadata.manual_contributions : []
  const newList = [item, ...list].slice(0, 200) // keep at most 200 recent items

  const updates: any = { metadata: { ...metadata, manual_contributions: newList }, updated_at: now }
  // Also increment contributions total if points > 0
  let newContrib = row?.contributions || 0
  if (!Number.isNaN(points)) newContrib = Math.max(0, newContrib + points)
  updates.contributions = newContrib

  const { data: updated, error: upErr } = await supabaseAdmin.from('ambassadors').update(updates).eq('id', ambassador_id).select('id, metadata, contributions').single()
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })

  // Find ambassador by contribution id and remove it
  const { data: rows, error } = await supabaseAdmin.from('ambassadors').select('id, metadata, contributions').not('metadata', 'is', null)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  let found: any = null
  for (const r of rows || []) {
    const items = Array.isArray(r.metadata?.manual_contributions) ? r.metadata.manual_contributions : []
    const idx = items.findIndex((x: any) => x.id === id)
    if (idx >= 0) { found = { row: r, idx, item: items[idx] }; break }
  }
  if (!found) return NextResponse.json({ success: false, error: '未找到记录' }, { status: 404 })

  const now = new Date().toISOString()
  const items = Array.isArray(found.row.metadata?.manual_contributions) ? found.row.metadata.manual_contributions : []
  const item = items.find((x: any) => x.id === id)
  const newList = items.filter((x: any) => x.id !== id)
  const updates: any = { metadata: { ...found.row.metadata, manual_contributions: newList }, updated_at: now }
  // decrease total points if item has points
  const delta = Number(item?.points || 0)
  if (!Number.isNaN(delta) && delta !== 0) {
    updates.contributions = Math.max(0, (found.row.contributions || 0) - delta)
  }

  const { error: upErr } = await supabaseAdmin.from('ambassadors').update(updates).eq('id', found.row.id)
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
