'use client'

import Header from '@/components/layout/Header'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useEffect, useState, useRef } from 'react'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'

// 强制动态渲染，避免构建时预渲染导致 QueryClient 错误
export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const { isConnected, status } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { isAdmin, loading, error, refresh } = useEnsureAdminSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const autoPromptRef = useRef(false)
  useEffect(() => { setMounted(true) }, [])

  // Auto-open connect modal when entering /admin if not connected (only once)
  useEffect(() => {
    if (!mounted) return
    if (!isConnected && !autoPromptRef.current) {
      autoPromptRef.current = true
      if (openConnectModal) openConnectModal()
    }
  }, [mounted, isConnected, openConnectModal])

  // 当用户连接后，自动尝试管理员认证；若断开则提示连接
  const showConnectHint = !isConnected || status !== 'connected'

  if (!mounted) return null

  if (showConnectHint) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">管理员入口</h1>
            <p className="text-sm text-gray-600 mb-4">请先连接管理员钱包再继续。</p>
            <button
              onClick={() => { try { (window as any).dispatchEvent(new CustomEvent('zd-open-login')) } catch {}; openConnectModal?.() }}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm"
            >连接钱包</button>
          </div>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-4">管理员认证</h1>
            <ol className="space-y-2 text-xs list-decimal list-inside mb-4 text-gray-700">
              <li>确保当前钱包地址已在服务器环境变量 <code>ADMIN_WALLETS</code> 中。</li>
              <li>若刚修改 <code>ADMIN_WALLETS</code>，请重启服务端使其生效。</li>
              <li>保持网络为指定的 ZetaChain（测试网或主网）。</li>
              <li>点击下方按钮发起签名挑战（不涉及资金转移）。</li>
            </ol>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault()
                  console.log('[AdminPage] 开始认证按钮被点击')
                  refresh()
                }}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors"
              >{loading ? '认证中...' : '开始认证'}</button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  console.log('[AdminPage] 重新连接按钮被点击')
                  openConnectModal?.()
                }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 transition-colors"
              >重新连接</button>
              <button 
                onClick={() => router.push('/')} 
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 transition-colors"
              >返回首页</button>
            </div>
            <div className="mt-6 text-xs text-gray-500">若持续失败：尝试清除站点 Cookie、切换或重装钱包扩展、或使用 WalletConnect 在移动端授权。</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-10">ZetaDAO 管理后台</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xl font-semibold mb-1">商店管理</div>
                <div className="text-sm text-gray-600 mb-4">创建/编辑商品、查看订单并在链上处理状态</div>
              </div>
              <button onClick={() => router.push('/admin/shop')} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">进入</button>
            </div>
            <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xl font-semibold mb-1">视频管理</div>
                <div className="text-sm text-gray-600 mb-4">创建/编辑/删除视频，自动解析封面</div>
              </div>
              <button onClick={() => router.push('/admin/videos')} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">进入</button>
            </div>
            <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xl font-semibold mb-1">大使管理</div>
                <div className="text-sm text-gray-600 mb-4">大使资料、贡献与活动管理</div>
              </div>
              <button onClick={() => router.push('/admin/ambassadors')} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">进入</button>
            </div>
            <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between md:col-span-3">
              <div>
                <div className="text-xl font-semibold mb-1">投稿审核</div>
                <div className="text-sm text-gray-600 mb-4">用户投稿审核与分类管理（创建/修改/删除）</div>
              </div>
              <div>
                <button onClick={() => router.push('/admin/moderation')} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">进入</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
