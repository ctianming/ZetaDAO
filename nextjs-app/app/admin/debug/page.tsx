"use client"

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { WalletSelect } from '@/components/wallet/WalletSelect'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'

export default function AdminDebugPage() {
  const [account, setAccount] = useState<string | null>(null)
  const { isAdmin, loading, error, refresh } = useEnsureAdminSession()

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">管理员调试</h1>
      <div className="space-y-2 p-4 rounded border border-zinc-800">
        <p className="text-sm text-zinc-400">当前账户：{account ?? '未连接'}</p>
        <p className="text-sm text-zinc-400">管理员会话：{isAdmin ? '已认证' : '未认证'}</p>
        {loading && <p className="text-xs text-zinc-500">认证中…</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={() => refresh()} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={loading}>
            重新认证
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <WalletSelect onConnected={(acct) => setAccount(acct)} />
        <p className="text-xs text-zinc-500">
          说明：此页面用于 WalletConnect 深链、钱包连接与管理员会话的调试与排查。移动端默认深链唤起，桌面建议结合二维码方案。
        </p>
      </div>
    </div>
  )
}
