'use client'

import Header from '@/components/layout/Header'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const walletAddress = (session as any)?.walletAddress as string | undefined

  useEffect(() => {
    const load = async () => {
      if (!walletAddress) return
      const res = await fetch(`/api/user?wallet=${walletAddress}`, { cache: 'no-store' })
      const j = await res.json()
      if (j?.data?.username) setUsername(j.data.username)
    }
    load()
  }, [walletAddress])

  const save = async () => {
    if (!walletAddress) return
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, username }),
      })
      const j = await res.json()
      if (!j.success) alert(j.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">个人资料</h1>
          <div className="space-y-6 bg-white p-6 rounded-2xl shadow">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">钱包地址</label>
              <div className="px-3 py-2 border rounded-lg bg-gray-50 break-all">{walletAddress || '未绑定（连接钱包以绑定）'}</div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">用户名</label>
              <input className="border rounded-lg px-3 py-2 w-full" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">第三方账号</label>
              <div className="px-3 py-2 border rounded-lg bg-gray-50">{session?.user?.email || '未绑定 Google'}</div>
            </div>
            <div>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary-500 text-white rounded-lg">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
