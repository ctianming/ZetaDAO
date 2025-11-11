import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'
import { SHOP_ABI, SHOP_ORDER_STATUS_CODE } from '@/lib/shop'
import { createPublicClient, decodeEventLog, Hex, http } from 'viem'
import { getZetaChainConfig } from '@/lib/web3'

const STATUS_META = {
  shipped: { column: 'shipped_at', status: 'shipped' },
  completed: { column: 'completed_at', status: 'completed' },
  cancelled: { column: 'cancelled_at', status: 'cancelled' },
  refunded: { column: 'refunded_at', status: 'refunded' },
} as const

type TargetStatus = keyof typeof STATUS_META

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  if (!isAdminFromSession(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const orderId = body.order_id as string | undefined
  const txHash = body.tx_hash as string | undefined
  const status = body.status as TargetStatus | undefined
  const note = (body.note as string | undefined)?.slice(0, 240) || null
  const providedOnchainId = body.onchain_order_id as string | undefined

  if (!orderId || !txHash || !status || !(status in STATUS_META)) {
    return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })
  }

  const { data: order, error: fetchError } = await supabaseAdmin.from('shop_orders').select('*').eq('id', orderId).maybeSingle()
  if (fetchError) return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  if (!order) return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 })

  const expectedCurrentStatus: Record<TargetStatus, string[]> = {
    shipped: ['paid'],
    completed: ['shipped'],
    cancelled: ['created'],
    refunded: ['paid'],
  }
  if (!expectedCurrentStatus[status].includes(order.status)) {
    return NextResponse.json({ success: false, error: '状态不匹配，无法执行操作' }, { status: 409 })
  }

  const onchainId = order.onchain_id || providedOnchainId
  if (!onchainId) {
    return NextResponse.json({ success: false, error: '订单缺少链上编号' }, { status: 409 })
  }

  const { CHAIN, RPC_URL } = getZetaChainConfig()
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null)
  if (!receipt || receipt.status !== 'success') {
    return NextResponse.json({ success: false, error: '交易未成功或未确认' }, { status: 400 })
  }

  const contractAddress = (process.env.NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS || '').toLowerCase()
  if (!contractAddress) return NextResponse.json({ success: false, error: '合约未配置' }, { status: 500 })

  const statusCode = SHOP_ORDER_STATUS_CODE[status]
  let matched = false
  for (const log of receipt.logs) {
    if ((log.address as string).toLowerCase() !== contractAddress) continue
    try {
      const decoded = decodeEventLog({ abi: SHOP_ABI, data: log.data, topics: log.topics as any }) as any
      if (decoded.eventName === 'OrderStatusChanged') {
        const eventOrderId = BigInt(decoded.args.orderId).toString()
        const eventStatus = Number(decoded.args.status)
        if (eventOrderId === onchainId && eventStatus === statusCode) {
          matched = true
          break
        }
      }
    } catch {
      // ignore unrelated logs
    }
  }

  if (!matched) return NextResponse.json({ success: false, error: '未找到匹配的状态事件' }, { status: 400 })

  const meta = STATUS_META[status]
  const updates: Record<string, any> = {
    status: meta.status,
    last_event_tx_hash: txHash,
    last_status_note: note,
    updated_at: new Date().toISOString(),
  }
  if (!order.onchain_id) updates.onchain_id = onchainId
  if (meta.column) updates[meta.column] = new Date().toISOString()
  if (status === 'refunded') updates.refund_tx_hash = txHash

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('shop_orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()
  if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })

  // Adjust inventory off-chain for cancel/refund to mirror on-chain stock increment.
  try {
    if (status === 'cancelled' || status === 'refunded') {
      const productId = order.product_id as string | undefined
      const qty = Number(order.quantity || 0)
      if (productId && Number.isFinite(qty) && qty > 0) {
        const { data: product } = await supabaseAdmin
          .from('shop_products')
          .select('id, stock')
          .eq('id', productId)
          .maybeSingle()
        const current = Number(product?.stock ?? 0)
        if (Number.isFinite(current)) {
          const next = current + qty
          await supabaseAdmin
            .from('shop_products')
            .update({ stock: String(next), updated_at: new Date().toISOString() })
            .eq('id', productId)
        }
      }
    }
  } catch {
    // best-effort consistency; admin can correct if needed
  }

  return NextResponse.json({ success: true, data: updated })
}
