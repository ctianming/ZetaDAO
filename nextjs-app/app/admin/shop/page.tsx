"use client"

import Header from '@/components/layout/Header'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { ShopProduct, ShopOrder } from '@/types'
import { formatUnits, parseUnits } from 'viem'
import { SHOP_ABI, SHOP_CONTRACT_ADDRESS } from '@/lib/shop'
import { getZetaChainConfig } from '@/lib/web3'
import { keccak256, stringToBytes, decodeEventLog } from 'viem'

// 登录与钱包连接已解耦：此页仅依赖 Cookie 中的管理员校验与前端连接钱包用于链上操作

type ActionKey = 'ship' | 'complete' | 'cancel' | 'refund'

const ACTIONS: Record<
  ActionKey,
  {
    label: string
    status: 'shipped' | 'completed' | 'cancelled' | 'refunded'
    fn: 'markShipped' | 'markCompleted' | 'cancelOrder' | 'refundOrder'
    allowed: ShopOrder['status'][]
  }
> = {
  ship: { label: '标记发货', status: 'shipped', fn: 'markShipped', allowed: ['paid'] },
  complete: { label: '标记完成', status: 'completed', fn: 'markCompleted', allowed: ['shipped'] },
  cancel: { label: '取消订单', status: 'cancelled', fn: 'cancelOrder', allowed: ['created'] },
  refund: { label: '退款', status: 'refunded', fn: 'refundOrder', allowed: ['paid'] },
}

const PRODUCT_STATUS_OPTIONS: ShopProduct['status'][] = ['active', 'inactive']

export default function AdminShopPage() {
  const { address, isConnected } = useAccount()
  const currentChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const router = useRouter()
  const { show } = useToast()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { EXPLORER_BASE } = getZetaChainConfig()

  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [initializing, setInitializing] = useState(true)

  const [list, setList] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<ShopProduct>>({ status: 'inactive', stock: '0' })

  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        setInitializing(true)
        // 基于已连接钱包的 httpOnly Cookie 进行管理员校验
  const adminRes = await fetch(`/api/auth/is-admin?adminWallet=${encodeURIComponent(address || '')}`, { cache: 'no-store', headers: address ? { 'X-Admin-Wallet': address } : {} })
        const adminJson = await adminRes.json()
        if (!adminJson?.isAdmin) {
          show('需要管理员权限', { type: 'error' })
          router.push('/')
          return
        }
      } catch (error) {
        console.error('初始化管理员商店失败', error)
        show('管理员校验失败', { type: 'error' })
        router.push('/')
      } finally {
        setInitializing(false)
      }
    }
    init()
  }, [router, show])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
  const res = await fetch(`/api/shop/products?includeInactive=1${address ? `&adminWallet=${encodeURIComponent(address)}` : ''}`, { cache: 'no-store', headers: address ? { 'X-Admin-Wallet': address } : {} })
      const json = (await res.json()) as { success?: boolean; data?: ShopProduct[] }
      if (json?.success && Array.isArray(json.data)) {
        setList(json.data)
      }
    } catch (error) {
      console.error('加载商品失败', error)
      show('商品加载失败', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [show])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
  const res = await fetch(`/api/shop/orders${address ? `?adminWallet=${encodeURIComponent(address)}` : ''}`, { cache: 'no-store', headers: address ? { 'X-Admin-Wallet': address } : {} })
      const json = (await res.json()) as { success?: boolean; data?: ShopOrder[] }
      if (json?.success && Array.isArray(json.data)) {
        setOrders(json.data)
      }
    } catch (error) {
      console.error('加载订单失败', error)
      show('订单加载失败', { type: 'error' })
    } finally {
      setOrdersLoading(false)
    }
  }, [show])

  useEffect(() => {
    if (initializing) return
    if (tab === 'products') {
      loadProducts()
    } else {
      loadOrders()
    }
  }, [initializing, tab, loadOrders, loadProducts])

  const saveProduct = async () => {
    try {
      const method = form.id ? 'PUT' : 'POST'
  const res = await fetch('/api/shop/products', { method, headers: { 'Content-Type': 'application/json', ...(address ? { 'X-Admin-Wallet': address } : {}) }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!json?.success) {
        show(json?.error || '保存失败', { type: 'error' })
        return
      }
      show('保存成功', { type: 'success' })
      setForm({ status: 'inactive', stock: '0' })
      await loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      show(message, { type: 'error' })
    }
  }

  const generateMetadata = async (p?: ShopProduct, force = false) => {
    try {
      const payload: any = {}
      if (p?.id) payload.id = p.id
      const slug = p?.slug || form.slug
      if (!payload.id && !slug) {
        show('请先填写 slug 或选择商品', { type: 'error' })
        return
      }
      if (slug) payload.slug = slug
      if (force) payload.force = true
      const res = await fetch('/api/shop/products/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(address ? { 'X-Admin-Wallet': address } : {}) },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json?.success) {
        show(json?.error || '生成元数据失败', { type: 'error' })
        return
      }
      const uri = json.metadata_uri as string
      if (p?.id) {
        await loadProducts()
      } else {
        setForm((state) => ({ ...state, metadata_uri: uri }))
      }
      show('已生成元数据URI', { type: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成元数据失败'
      show(message, { type: 'error' })
    }
  }

  // 将商品同步到链上（创建或更新）
  const syncOnchain = async (product: ShopProduct) => {
    if (!isConnected || !address) {
      show('请先连接管理员钱包', { type: 'error' })
      return
    }
    if (!publicClient) {
      show('缺少链上客户端支持', { type: 'error' })
      return
    }
    if (!SHOP_CONTRACT_ADDRESS) {
      show('未配置合约地址 NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS', { type: 'error' })
      return
    }
    if (!product.metadata_uri) {
      show('请先生成或填写 metadata_uri', { type: 'error' })
      return
    }
    // 强制网络
  const desired = Number(process.env.NEXT_PUBLIC_SHOP_CHAIN_ID || process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001')
    if (currentChainId !== desired) {
      try {
        await switchChainAsync({ chainId: desired })
      } catch (e: any) {
        show('请先切换到指定 ZetaChain 网络', { type: 'error' })
        return
      }
    }
    const isCreate = !product.onchain_id
    try {
      show(isCreate ? '正在创建链上商品...' : '正在更新链上商品...', { type: 'info' })
      let txHash: `0x${string}`
      if (isCreate) {
        txHash = await writeContractAsync({
          address: SHOP_CONTRACT_ADDRESS as `0x${string}`,
          abi: SHOP_ABI,
          functionName: 'createProduct',
          args: [
            BigInt(product.price_wei),
            BigInt(product.stock || '0'),
            product.status === 'active',
            product.metadata_uri as string,
          ] as const,
        })
      } else {
        txHash = await writeContractAsync({
          address: SHOP_CONTRACT_ADDRESS as `0x${string}`,
          abi: SHOP_ABI,
          functionName: 'updateProduct',
          args: [
            BigInt(product.onchain_id as string),
            BigInt(product.price_wei),
            BigInt(product.stock || '0'),
            product.status === 'active',
            product.metadata_uri as string,
          ] as const,
        })
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (!receipt || receipt.status !== 'success') throw new Error('链上交易失败')
      let newId: string | undefined = product.onchain_id
      if (isCreate) {
        for (const log of receipt.logs) {
          try {
            const decoded: any = decodeEventLog({ abi: SHOP_ABI, data: log.data, topics: log.topics as any })
            if (decoded.eventName === 'ProductCreated') {
              newId = BigInt(decoded.args.productId).toString()
              break
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (!newId) throw new Error('未能解析链上商品ID')
      // 回写数据库 onchain_id / last_synced_block（可选：读取区块号）
      await fetch('/api/shop/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(address ? { 'X-Admin-Wallet': address } : {}) },
        body: JSON.stringify({ id: product.id, onchain_id: newId }),
      })
      await loadProducts()
      show(isCreate ? '链上商品已创建' : '链上商品已更新', { type: 'success' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : '链上同步失败'
      show(msg, { type: 'error' })
    }
  }

  const editProduct = (product: ShopProduct) => {
    setForm({ ...product })
  }

  const deleteProduct = async (product: ShopProduct) => {
    if (!confirm(`确认删除 ${product.name} 吗？`)) return
    try {
  const res = await fetch(`/api/shop/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE', headers: address ? { 'X-Admin-Wallet': address } : {} })
      const json = await res.json()
      if (!json?.success) {
        show(json?.error || '删除失败', { type: 'error' })
        return
      }
      show('已删除', { type: 'success' })
      await loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败'
      show(message, { type: 'error' })
    }
  }

  const exportCSV = async () => {
    try {
  const res = await fetch(`/api/shop/orders?format=csv${address ? `&adminWallet=${encodeURIComponent(address)}` : ''}`, { headers: address ? { 'X-Admin-Wallet': address } : {} })
      if (!res.ok) {
        throw new Error('导出订单失败')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'shop-orders.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出订单失败', error)
      const message = error instanceof Error ? error.message : '导出订单失败'
      show(message, { type: 'error' })
    }
  }

  const encodeNote = (value: string | null) => {
    if (!value) return '0x'
    try {
      return keccak256(stringToBytes(value))
    } catch {
      return keccak256(stringToBytes(value.slice(0, 128)))
    }
  }

  const handleOrderAction = async (order: ShopOrder, key: ActionKey) => {
    const action = ACTIONS[key]
    if (!action.allowed.includes(order.status)) {
      show('当前状态不支持该操作', { type: 'error' })
      return
    }
    if (!isConnected || !address) {
      show('请先连接管理员钱包', { type: 'error' })
      return
    }
    if (!publicClient) {
      show('缺少链上客户端支持', { type: 'error' })
      return
    }
    if (!SHOP_CONTRACT_ADDRESS) {
      show('合约地址未配置', { type: 'error' })
      return
    }
    if (!order.onchain_id) {
      show('订单尚未关联链上编号', { type: 'error' })
      return
    }
    // Enforce network before attempting on-chain action
    const desired = Number(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001')
    if (currentChainId !== desired) {
      try {
        await switchChainAsync({ chainId: desired })
      } catch (e: any) {
        if (e?.code === 4001) {
          show('已取消切换网络，请在钱包中切换至指定 ZetaChain 网络后重试', { type: 'error' })
        } else {
          show('请先在钱包中切换至指定 ZetaChain 网络', { type: 'error' })
        }
        return
      }
    }
    const noteInput = window.prompt(`${action.label}备注（可留空）：`)?.trim() ?? ''
    const noteHash = encodeNote(noteInput)
    const identifier = `${order.id}-${key}`
    setActionLoading(identifier)
    try {
      const txHash = await writeContractAsync({
        address: SHOP_CONTRACT_ADDRESS as `0x${string}`,
        abi: SHOP_ABI,
        functionName: action.fn,
        args: [BigInt(order.onchain_id), noteHash],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (!receipt || receipt.status !== 'success') {
        throw new Error('链上交易未成功')
      }

      const resp = await fetch('/api/shop/order/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'X-Admin-Wallet': address } : {}),
        },
        body: JSON.stringify({
          order_id: order.id,
          tx_hash: txHash,
          status: action.status,
          note: noteInput || null,
          onchain_order_id: order.onchain_id,
        }),
      })
      const json = await resp.json()
      if (!json?.success) {
        throw new Error(json?.error || '订单状态更新失败')
      }

      show('订单状态已更新', { type: 'success' })
      await loadOrders()
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      show(message, { type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="text-sm text-gray-500">加载中...</div>
        </main>
      </div>
    )
  }

  // 管理页渲染，不再依赖“绑定管理员钱包”，链上操作会在点击时校验连接态

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">商店管理</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('products')}
                className={`px-3 py-1.5 rounded-full ${tab === 'products' ? 'bg-primary-600 text-white' : 'bg-white'}`}
              >
                商品
              </button>
              <button
                onClick={() => setTab('orders')}
                className={`px-3 py-1.5 rounded-full ${tab === 'orders' ? 'bg-primary-600 text-white' : 'bg-white'}`}
              >
                订单
              </button>
            </div>
          </div>

          {tab === 'products' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-white rounded-2xl p-5 border shadow-sm">
                <div className="text-lg font-semibold mb-3">{form.id ? '编辑商品' : '创建商品'}</div>
                <div className="space-y-3">
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="slug（唯一）"
                    value={form.slug || ''}
                    onChange={(event) => setForm((state) => ({ ...state, slug: event.target.value }))}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="名称"
                    value={form.name || ''}
                    onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                  />
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="描述"
                    rows={3}
                    value={form.description || ''}
                    onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="图片URL"
                    value={form.image_url || ''}
                    onChange={(event) => setForm((state) => ({ ...state, image_url: event.target.value }))}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="价格（ZETA，最多18位小数）"
                    value={form.price_wei ? formatUnits(BigInt(form.price_wei), 18) : ''}
                    onChange={(event) => {
                      const value = event.target.value
                      try {
                        const wei = parseUnits((value || '0') as `${string}`, 18).toString()
                        setForm((state) => ({ ...state, price_wei: wei }))
                      } catch {
                        // ignore invalid decimal input until用户修正
                      }
                    }}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="库存"
                    type="number"
                    value={form.stock || '0'}
                    onChange={(event) => setForm((state) => ({ ...state, stock: event.target.value }))}
                  />
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.status || 'active'}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, status: event.target.value as ShopProduct['status'] }))
                    }
                  >
                    {PRODUCT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === 'active' ? '上架' : '下架'}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="metadata_uri（可选）"
                      value={form.metadata_uri || ''}
                      onChange={(event) => setForm((state) => ({ ...state, metadata_uri: event.target.value }))}
                    />
                    <button
                      type="button"
                      className="px-2 py-1 rounded border text-xs"
                      onClick={() => generateMetadata()}
                    >
                      自动生成
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-primary-600 text-white" onClick={saveProduct}>
                    保存
                  </button>
                  {form.id && (
                    <button
                      className="px-4 py-2 rounded-lg border"
                      onClick={() => setForm({ status: 'inactive', stock: '0' })}
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl p-5 border shadow-sm">
                <div className="text-lg font-semibold mb-3">商品列表</div>
                {loading ? (
                  <div className="text-sm text-gray-500">加载中...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">名称</th>
                          <th className="py-2 pr-4">价格（wei）</th>
                          <th className="py-2 pr-4">库存</th>
                          <th className="py-2 pr-4">状态</th>
                          <th className="py-2 pr-4">链上ID</th>
                          <th className="py-2 pr-4">元数据</th>
                          <th className="py-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((product) => (
                          <tr key={product.id} className="border-b">
                            <td className="py-2 pr-4">{product.name}</td>
                            <td className="py-2 pr-4">{product.price_wei}</td>
                            <td className="py-2 pr-4">{product.stock}</td>
                            <td className="py-2 pr-4">{product.status}</td>
                            <td className="py-2 pr-4">{product.onchain_id || '-'}</td>
                            <td className="py-2 pr-4 align-top">
                              {product.metadata_uri ? (
                                <div className="flex flex-col gap-1">
                                  <a
                                    href={product.metadata_uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-600 underline"
                                  >
                                    查看
                                  </a>
                                  <button
                                    onClick={() => generateMetadata(product, true)}
                                    className="text-[11px] px-2 py-0.5 rounded bg-primary-50 text-primary-700"
                                  >
                                    重新生成
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => generateMetadata(product)}
                                  className="text-[11px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                                >
                                  生成
                                </button>
                              )}
                            </td>
                            <td className="py-2 space-x-2">
                              <button onClick={() => editProduct(product)} className="px-3 py-1 border rounded">
                                编辑
                              </button>
                              <button
                                onClick={() => syncOnchain(product)}
                                className="px-3 py-1 border rounded text-xs"
                              >
                                {product.onchain_id ? '更新链上' : '上链'}
                              </button>
                              <button
                                onClick={() => deleteProduct(product)}
                                className="px-3 py-1 border rounded text-red-600"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold">订单列表</div>
                <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg border">
                  导出 CSV
                </button>
              </div>
              {ordersLoading ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">链上ID</th>
                        <th className="py-2 pr-4">状态</th>
                        <th className="py-2 pr-4">数量</th>
                        <th className="py-2 pr-4">总金额(wei)</th>
                        <th className="py-2 pr-4">收件人</th>
                        <th className="py-2 pr-4">电话</th>
                        <th className="py-2 pr-4">地址</th>
                        <th className="py-2 pr-4">买家地址</th>
                        <th className="py-2 pr-4">支付Tx</th>
                        <th className="py-2 pr-4">元数据哈希</th>
                        <th className="py-2 pr-4">创建时间</th>
                        <th className="py-2 pr-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b">
                          <td className="py-2 pr-4">{order.onchain_id || '-'}</td>
                          <td className="py-2 pr-4">{order.status}</td>
                          <td className="py-2 pr-4">{order.quantity}</td>
                          <td className="py-2 pr-4">{order.total_price_wei}</td>
                          <td className="py-2 pr-4">{order.shipping_contact}</td>
                          <td className="py-2 pr-4">{order.shipping_phone}</td>
                          <td className="py-2 pr-4 max-w-[280px] truncate" title={order.shipping_address}>
                            {order.shipping_address}
                          </td>
                          <td className="py-2 pr-4">{order.buyer_address || '-'}</td>
                          <td className="py-2 pr-4">
                            {order.paid_tx_hash ? (
                              <a
                                className="text-blue-600 hover:underline"
                                  href={`${EXPLORER_BASE}/tx/${order.paid_tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {order.paid_tx_hash.slice(0, 10)}…
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 pr-4 text-xs break-all">{order.metadata_hash || '-'}</td>
                          <td className="py-2 pr-4">{new Date(order.created_at).toLocaleString()}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              {(['ship', 'complete', 'cancel', 'refund'] as ActionKey[])
                                .filter((key) => ACTIONS[key].allowed.includes(order.status))
                                .map((key) => {
                                  const id = `${order.id}-${key}`
                                  return (
                                    <button
                                      key={key}
                                      className="px-3 py-1.5 rounded border text-xs"
                                      disabled={actionLoading === id}
                                      onClick={() => handleOrderAction(order, key)}
                                    >
                                      {actionLoading === id ? '处理中...' : ACTIONS[key].label}
                                    </button>
                                  )
                                })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
