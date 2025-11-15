import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { keccak256, stringToBytes } from 'viem'

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const productId = body.product_id as string
  const quantity = Math.max(1, Number(body.quantity || 1))
  const addressId = body.address_id as string | undefined
  const addressInline = body.address_inline as any

  if (!productId) return NextResponse.json({ success: false, error: '缺少商品' }, { status: 400 })
  const { data: prod } = await supabaseAdmin
    .from('shop_products')
    .select('id,name,price_wei,stock,status,onchain_id')
    .eq('id', productId)
    .maybeSingle()
  if (!prod || prod.status !== 'active') return NextResponse.json({ success: false, error: '商品不可用' }, { status: 404 })
  if (!prod.onchain_id) return NextResponse.json({ success: false, error: '商品尚未同步到链上' }, { status: 409 })

  let shipping_contact = ''
  let shipping_phone = ''
  let shipping_address = ''
  if (addressId) {
    const { data: addr } = await supabaseAdmin
      .from('shop_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_uid', uid)
      .maybeSingle()
    if (!addr) return NextResponse.json({ success: false, error: '地址无效' }, { status: 400 })
    shipping_contact = addr.contact_name
    shipping_phone = addr.phone
    shipping_address = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code, addr.country]
      .filter(Boolean).join(' ')
  } else if (addressInline) {
    shipping_contact = addressInline.contact_name
    shipping_phone = addressInline.phone
    shipping_address = addressInline.address
  } else {
    return NextResponse.json({ success: false, error: '请提供收货信息' }, { status: 400 })
  }

  const unitPrice = BigInt(prod.price_wei)
  const totalPrice = unitPrice * BigInt(quantity)
  const payload = {
    contact: shipping_contact,
    phone: shipping_phone,
    address: shipping_address,
    quantity,
    productId: prod.id,
    productOnchainId: prod.onchain_id,
  }
  const metadataHash = keccak256(stringToBytes(JSON.stringify(payload)))

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      buyer_uid: uid,
      product_id: prod.id,
      product_onchain_id: prod.onchain_id,
      quantity,
      unit_price_wei: unitPrice.toString(),
      total_price_wei: totalPrice.toString(),
      status: 'created',
      metadata_hash: metadataHash,
      shipping_contact,
      shipping_phone,
      shipping_address,
      offchain_metadata: payload,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const contractAddress = process.env.NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS || ''
  const chainId = Number(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001')
  return NextResponse.json({
    success: true,
    data: {
      order: data,
      contractAddress,
      chainId,
      onchainCall: {
        productId: prod.onchain_id,
        quantity,
        metadataHash,
        totalPrice: totalPrice.toString(),
      },
    },
  })
}
