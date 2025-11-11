"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { ShopProduct } from '@/types'
import Image from 'next/image'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useToast } from '@/components/ui/Toast'
import { SHOP_ABI, SHOP_CONTRACT_ADDRESS } from '@/lib/shop'
import { getZetaChainConfig } from '@/lib/web3'
import { Hex, formatUnits, decodeEventLog } from 'viem'
import { AUTO_REFRESH_ENABLED, SWR_REFRESH_MS } from '@/lib/config'

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [selected, setSelected] = useState<ShopProduct | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addressInline, setAddressInline] = useState({ contact_name: '', phone: '', address: '' })
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { show } = useToast()
  const { CHAIN_ID, CHAIN } = getZetaChainConfig()

  useEffect(() => {
    let timer: any
    const load = async () => {
      try {
        const res = await fetch('/api/shop/products', { cache: 'no-store' })
        const j = await res.json()
        if (j?.success) setProducts(j.data)
      } finally { setLoading(false) }
    }
    load()
    // 自动刷新（可通过环境变量控制）
    if (AUTO_REFRESH_ENABLED && SWR_REFRESH_MS > 0) {
      timer = setInterval(load, SWR_REFRESH_MS)
    }
    return () => timer && clearInterval(timer)
  }, [])

  // After a successful purchase we clear selection but we also want to refresh product list (stock changes)
  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/shop/products')
      const j = await res.json()
      if (j?.success) setProducts(j.data)
    } catch {}
  }, [])

  const totalWei = useMemo(() => {
    if (!selected) return 0n
    try {
      return BigInt(selected.price_wei) * BigInt(quantity || 1)
    } catch { return 0n }
  }, [selected, quantity])

  const { writeContractAsync, error: writeError } = useWriteContract()
  const publicClient = usePublicClient()

  useEffect(() => {
    if (writeError) show(writeError.message, { type: 'error' })
  }, [writeError, show])

  const startPurchase = async () => {
    if (!selected) return
    if (!isConnected || !address) { show('请先连接钱包', { type: 'error' }); return }
    if (!addressInline.contact_name || !addressInline.phone || !addressInline.address) {
      show('请填写收货信息', { type: 'error' }); return
    }
    if (!SHOP_CONTRACT_ADDRESS) { show('合约地址未配置，无法支付', { type: 'error' }); return }

    setBuying(true)
    try {
      // Enforce network before any on-chain interactions
      const desired = CHAIN_ID
      if (chainId !== desired) {
        try {
          await switchChainAsync({ chainId: desired })
        } catch (e: any) {
          if (e?.code === 4001) {
            show('已取消切换网络，请在钱包中切换至指定 ZetaChain 网络后重试', { type: 'error' })
          } else {
            show('请先在钱包中切换至指定 ZetaChain 网络', { type: 'error' })
          }
          setBuying(false)
          return
        }
      }
      // 1) Create order off-chain
      const res = await fetch('/api/shop/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selected.id, quantity, address_inline: addressInline })
      })
      const j = await res.json()
      if (!j.success) { show(j.error || '下单失败', { type: 'error' }); setBuying(false); return }
      const { order, onchainCall } = j.data
      const productOnchainId = BigInt(onchainCall.productId)
      const qty = BigInt(onchainCall.quantity)
      const metadataHash = onchainCall.metadataHash as Hex

      const createHash = await writeContractAsync({
        address: SHOP_CONTRACT_ADDRESS as `0x${string}`,
        abi: SHOP_ABI as any,
        functionName: 'createOrder',
        args: [productOnchainId, qty, metadataHash],
      })
      const createReceipt = await publicClient?.waitForTransactionReceipt({ hash: createHash })
      if (!createReceipt) throw new Error('创建订单交易未确认')

      let onchainOrderId: string | null = null
      for (const log of createReceipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: SHOP_ABI, data: log.data, topics: log.topics as any }) as any
          if (decoded.eventName === 'OrderCreated') {
            const hash = String(decoded.args.metadataHash || '').toLowerCase()
            if (hash === metadataHash.toLowerCase()) {
              onchainOrderId = BigInt(decoded.args.orderId).toString()
              break
            }
          }
        } catch { /* ignore unrelated logs */ }
      }
      if (!onchainOrderId) throw new Error('未在交易日志中找到订单创建事件')

      await fetch('/api/shop/order/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          tx_hash: createHash,
          onchain_order_id: onchainOrderId,
          buyer_address: address,
        }),
      })
      const value = BigInt(onchainCall.totalPrice)
      const payHash = await writeContractAsync({
        address: SHOP_CONTRACT_ADDRESS as `0x${string}`,
        abi: SHOP_ABI as any,
        functionName: 'payOrder',
        value,
        args: [BigInt(onchainOrderId)],
      })

      await publicClient?.waitForTransactionReceipt({ hash: payHash })

      const confirmRes = await fetch('/api/shop/order/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          tx_hash: payHash,
          buyer_address: address,
          onchain_order_id: onchainOrderId,
        }),
      })
      const confirmJson = await confirmRes.json()
      if (!confirmJson.success) {
        throw new Error(confirmJson.error || '订单确认失败')
      }

  show('支付成功，订单已确认', { type: 'success' })
  setSelected(null)
  setQuantity(1)
  setAddressInline({ contact_name: '', phone: '', address: '' })
  // refresh product list to reflect updated stock
  await refreshProducts()
    } catch (e: any) {
      show(e.message || '支付失败', { type: 'error' })
      setBuying(false)
      return
    }

    setBuying(false)
  }

  const availableStock = useMemo(() => {
    if (!selected) return 0
    const raw = Number(selected.stock ?? 0)
    return Number.isFinite(raw) ? raw : 0
  }, [selected])

  const handleQuantityChange = (value: number) => {
    const max = availableStock > 0 ? availableStock : 9999
    setQuantity(Math.max(1, Math.min(value, max)))
  }

  const displayStock = selected ? (availableStock > 0 ? availableStock : '∞') : '-'

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Zeta 周边店</h1>
          <a href="/shop/addresses" className="text-sm text-primary-600 hover:underline">我的收货信息</a>
        </div>

        <div className="mb-4 text-xs text-gray-500">
          {loading ? '首次加载...' : `当前商品数：${products.filter(p=>p.status==='active').length}`}
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.filter(p=>p.status==='active').map(p => (
              <div key={p.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                {p.image_url && (
                  <div className="relative w-full h-48">
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="font-semibold text-lg line-clamp-1">{p.name}</div>
                  <div className="text-sm text-gray-600 line-clamp-2 mb-2">{p.description}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-primary-600 font-semibold">{formatUnits(BigInt(p.price_wei), 18)} ZETA</div>
                    <button className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white" onClick={()=>{ setSelected(p); setQuantity(1) }}>立即购买</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 购买弹窗 */}
      {selected && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/40" onClick={()=>!buying && setSelected(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border p-6">
            <div className="text-lg font-semibold mb-3">购买 {selected.name}</div>
            {/* 网络提示与一键切换 */}
            {isConnected && chainId !== CHAIN_ID && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                <div className="text-xs">当前网络不匹配，需 {CHAIN.name}</div>
                <button
                  className="text-xs underline"
                  onClick={async () => {
                    try { await switchChainAsync({ chainId: CHAIN_ID }) }
                    catch (e:any) {
                      if (e?.code === 4001) show('已取消切换网络', { type: 'error' })
                      else show('请先在钱包中切换至指定 ZetaChain 网络', { type: 'error' })
                    }
                  }}
                >切换</button>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-16 text-sm text-gray-600">数量</label>
                <input
                  type="number"
                  min={1}
                  max={availableStock > 0 ? availableStock : undefined}
                  value={quantity}
                  onChange={e => handleQuantityChange(Number(e.target.value || 1))}
                  className="border rounded-lg px-3 py-2 w-24"
                />
                <div className="text-sm text-gray-500">库存：{displayStock}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">收货信息</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2" placeholder="收件人" value={addressInline.contact_name} onChange={e=>setAddressInline(s=>({...s, contact_name: e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2" placeholder="手机号" value={addressInline.phone} onChange={e=>setAddressInline(s=>({...s, phone: e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2 sm:col-span-2" placeholder="详细地址" value={addressInline.address} onChange={e=>setAddressInline(s=>({...s, address: e.target.value}))} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-600">应付金额</div>
                <div className="text-xl font-semibold text-primary-600">{formatUnits(totalWei, 18)} ZETA</div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50" disabled={buying} onClick={()=>setSelected(null)}>取消</button>
                <button className="px-3 py-2 text-sm rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50" disabled={buying || totalWei<=0n} onClick={startPurchase}>{buying ? '支付中...' : '去支付'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
