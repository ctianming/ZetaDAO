"use client"
import { useState } from 'react'
import { walletLinks } from '@/lib/wallet/walletLinks'
import { connectWithWallet } from '@/lib/wallet/walletService'

interface Props {
  onConnected: (account: string) => void
}

export function WalletSelect({ onConnected }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (walletId: string) => {
    setError(null)
    setLoading(walletId)
    try {
      const { account } = await connectWithWallet(walletId)
      onConnected(account)
    } catch (e: any) {
      console.error('Connect failed', e)
      setError(e?.message || '连接失败，请重试')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">选择钱包</h3>
      <ul className="space-y-2">
        {walletLinks.map(w => (
          <li key={w.id}>
            <button
              onClick={() => handleClick(w.id)}
              disabled={!!loading}
              className="px-3 py-2 rounded bg-zinc-800 text-white disabled:opacity-50"
            >
              {loading === w.id ? `正在唤起 ${w.name}…` : w.name}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
