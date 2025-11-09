import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'
import { createPublicClient, http, decodeEventLog, Hex, parseAbi } from 'viem'
import { getZetaChainConfig } from '@/lib/web3'

const shopAbi = parseAbi([
  'event OrderPaid(uint256 orderId, address indexed buyer, uint256 amount)',
])

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const orderId = body.order_id as string
  const txHash = body.tx_hash as string
  const buyer = (body.buyer_address as string | undefined)?.toLowerCase()
  const providedOnchainId = body.onchain_order_id as string | undefined
  if (!orderId || !txHash) return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })

  const { data: order } = await supabaseAdmin.from('shop_orders').select('*').eq('id', orderId).maybeSingle()
  if (!order || order.buyer_uid !== uid) return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 })
  if (order.status === 'paid') return NextResponse.json({ success: true, data: order })
  if (!order.onchain_id && !providedOnchainId) {
    return NextResponse.json({ success: false, error: '订单缺少链上编号' }, { status: 400 })
  }

  const { CHAIN, RPC_URL } = getZetaChainConfig()
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null)
  if (!receipt || receipt.status !== 'success') {
    return NextResponse.json({ success: false, error: '交易未成功或未确认' }, { status: 400 })
  }

  const contractAddress = (process.env.NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS || '').toLowerCase()
  if (!contractAddress) return NextResponse.json({ success: false, error: '合约未配置' }, { status: 500 })

  let matched = false
  try {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress) continue
      try {
        const decoded = decodeEventLog({ abi: shopAbi, data: log.data, topics: log.topics as any })
        if (decoded.eventName === 'OrderPaid') {
          const onchainOrderId = BigInt(decoded.args.orderId as any).toString()
          const amount = BigInt(decoded.args.amount as any)
          const buyerAddr = String(decoded.args.buyer || '').toLowerCase()
          const expectedOrderId = order.onchain_id ? String(order.onchain_id) : providedOnchainId || null
          if (expectedOrderId && onchainOrderId === expectedOrderId && amount.toString() === order.total_price_wei && (!buyer || buyer === buyerAddr)) {
            matched = true
            break
          }
        }
      } catch {}
    }
  } catch {}

  if (!matched) return NextResponse.json({ success: false, error: '未找到匹配的支付事件' }, { status: 400 })

  const updates: Record<string, any> = {
    status: 'paid',
    buyer_address: buyer || order.buyer_address || null,
    chain_id: CHAIN.id,
    last_event_tx_hash: txHash,
    paid_tx_hash: txHash,
    updated_at: new Date().toISOString(),
  }
  if (!order.onchain_id && providedOnchainId) updates.onchain_id = providedOnchainId

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
