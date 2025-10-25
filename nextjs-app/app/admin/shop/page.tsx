"use client"

import Header from '@/components/layout/Header'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { ShopProduct, ShopOrder } from '@/types'
import { formatUnits, parseUnits } from 'viem'
import { SHOP_ABI, SHOP_CONTRACT_ADDRESS } from '@/lib/shop'
import { keccak256, stringToBytes } from 'viem'

type WalletIdentity = {
  provider: string
  account_id: string
}

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
  const router = useRouter()
  const { show } = useToast()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [boundWallet, setBoundWallet] = useState<string | null>(null)
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
        const res = await fetch('/api/user', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('获取用户信息失败')
        }
        const json = await res.json()
        if (!json?.success) {
          throw new Error(json?.error || '获取用户信息失败')
        }
        const identities: WalletIdentity[] = Array.isArray(json.data?.identities) ? json.data.identities : []
        const wallet = identities.find((i) => i.provider === 'wallet')?.account_id?.toLowerCase()
        if (!wallet) {
          show('请先在账户设置中绑定管理员钱包', { type: 'error' })
          router.push('/')
          return
        }
        setBoundWallet(wallet)
        const adminRes = await fetch('/api/auth/is-admin', {
          headers: { 'x-wallet-address': wallet },
          cache: 'no-store',
        })
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
      const res = await fetch('/api/shop/products?includeInactive=1', { cache: 'no-store' })
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
    if (!boundWallet) return
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/shop/orders', {
        headers: { 'x-wallet-address': boundWallet },
        cache: 'no-store',
      })
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
  }, [boundWallet, show])

  useEffect(() => {
    if (initializing || !boundWallet) return
    if (tab === 'products') {
      loadProducts()
    } else {
      loadOrders()
    }
  }, [initializing, boundWallet, tab, loadOrders, loadProducts])

  const saveProduct = async () => {
    if (!boundWallet) {
      show('管理员钱包未绑定', { type: 'error' })
      return
    }
    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/shop/products', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': boundWallet,
        },
        body: JSON.stringify(form),
      })
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

  const editProduct = (product: ShopProduct) => {
    setForm({ ...product })
  }

  const deleteProduct = async (product: ShopProduct) => {
    if (!boundWallet) {
      show('管理员钱包未绑定', { type: 'error' })
      return
    }
    if (!confirm(`确认删除 ${product.name} 吗？`)) return
    try {
      const res = await fetch(`/api/shop/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': boundWallet },
      })
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
    if (!boundWallet) {
      show('管理员钱包未绑定', { type: 'error' })
      return
    }
    try {
      const res = await fetch('/api/shop/orders?format=csv', {
        headers: { 'x-wallet-address': boundWallet },
      })
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
    if (!boundWallet) {
      show('管理员钱包未绑定', { type: 'error' })
      return
    }
    const action = ACTIONS[key]
    if (!action.allowed.includes(order.status)) {
      show('当前状态不支持该操作', { type: 'error' })
      return
    }
    if (!isConnected || !address) {
      show('请先连接管理员钱包', { type: 'error' })
      return
    }
    if (address.toLowerCase() !== boundWallet.toLowerCase()) {
      show('当前连接的钱包与绑定的管理员钱包不一致', { type: 'error' })
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
          'x-wallet-address': boundWallet,
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

  if (!boundWallet) {
    return null
  }

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
                            <td className="py-2 space-x-2">
                              <button onClick={() => editProduct(product)} className="px-3 py-1 border rounded">
                                编辑
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
                                href={`https://athens3.explorer.zetachain.com/tx/${order.paid_tx_hash}`}
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
