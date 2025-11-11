import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'
import { createPublicClient, decodeEventLog, Hex, http } from 'viem'
import { SHOP_ABI } from '@/lib/shop'
import { getZetaChainConfig } from '@/lib/web3'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = body.order_id as string | undefined
  const txHash = body.tx_hash as string | undefined
  const providedOnchainId = body.onchain_order_id as string | undefined
  const buyerAddress = (body.buyer_address as string | undefined)?.toLowerCase()
  if (!orderId || !txHash) return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })

  const { data: order, error: fetchError } = await supabaseAdmin.from('shop_orders').select('*').eq('id', orderId).maybeSingle()
  if (fetchError) return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  if (!order || order.buyer_uid !== uid) return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 })
  if (order.onchain_id) return NextResponse.json({ success: true, data: order })

  const { CHAIN, RPC_URL } = getZetaChainConfig()
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null)
  if (!receipt || receipt.status !== 'success') {
    return NextResponse.json({ success: false, error: '交易未成功或未确认' }, { status: 400 })
  }

  const contractAddress = (process.env.NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS || '').toLowerCase()
  if (!contractAddress) return NextResponse.json({ success: false, error: '合约未配置' }, { status: 500 })

  let matchedOrderId: string | null = null
  let matchedProductId: string | null = null

  for (const log of receipt.logs) {
    if ((log.address as string).toLowerCase() !== contractAddress) continue
    try {
      const decoded = decodeEventLog({ abi: SHOP_ABI, data: log.data, topics: log.topics as any }) as any
      if (decoded.eventName === 'OrderCreated') {
        const eventOrderId = BigInt(decoded.args.orderId).toString()
        const metadataHash = String(decoded.args.metadataHash || '').toLowerCase()
        const productId = BigInt(decoded.args.productId).toString()
        if (metadataHash && metadataHash === String(order.metadata_hash || '').toLowerCase()) {
          if (providedOnchainId && providedOnchainId !== eventOrderId) continue
          matchedOrderId = eventOrderId
          matchedProductId = productId
          break
        }
      }
    } catch {
      // ignore unrelated logs
    }
  }

  if (!matchedOrderId) {
    return NextResponse.json({ success: false, error: '未找到匹配的 OrderCreated 事件' }, { status: 400 })
  }

  const updates: Record<string, any> = {
    onchain_id: matchedOrderId,
    last_event_tx_hash: txHash,
    updated_at: new Date().toISOString(),
  }
  if (!order.product_onchain_id && matchedProductId) updates.product_onchain_id = matchedProductId
  if (buyerAddress) updates.buyer_address = buyerAddress
  if (!order.chain_id) updates.chain_id = CHAIN.id

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('shop_orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()
  if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })

  // Keep off-chain inventory consistent with on-chain: stock was reduced at createOrder.
  // Decrement product stock off-chain once when linking succeeds (first-time only).
  try {
    const productId = order.product_id as string | undefined
    const qty = Number(order.quantity || 0)
    if (productId && Number.isFinite(qty) && qty > 0) {
      const { data: product } = await supabaseAdmin
        .from('shop_products')
        .select('id, stock')
        .eq('id', productId)
        .maybeSingle()
      const current = Number(product?.stock ?? 0)
      if (Number.isFinite(current) && current > 0) {
        const next = Math.max(0, current - qty)
        await supabaseAdmin
          .from('shop_products')
          .update({ stock: String(next), updated_at: new Date().toISOString() })
          .eq('id', productId)
      }
    }
  } catch {
    // best-effort; inventory can be corrected by admin if needed
  }

  return NextResponse.json({ success: true, data: updated })
}
