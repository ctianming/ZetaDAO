import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'

function toCsv(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','))
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  if (!isAdminFromSession(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const format = url.searchParams.get('format')

  let query = supabaseAdmin.from('shop_orders').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  if (format === 'csv') {
    const rows = (data || []).map((o: any) => ({
      onchain_id: o.onchain_id,
      status: o.status,
      product_id: o.product_id,
      product_onchain_id: o.product_onchain_id,
      quantity: o.quantity,
      unit_price_wei: o.unit_price_wei,
      total_price_wei: o.total_price_wei,
      metadata_hash: o.metadata_hash,
      shipping_contact: o.shipping_contact,
      shipping_phone: o.shipping_phone,
      shipping_address: o.shipping_address,
      buyer_address: o.buyer_address,
      chain_id: o.chain_id,
      last_event_tx_hash: o.last_event_tx_hash,
      paid_tx_hash: o.paid_tx_hash,
      refund_tx_hash: o.refund_tx_hash,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }))
    const csv = toCsv(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shop-orders.csv"`,
      },
    })
  }

  return NextResponse.json({ success: true, data })
}
