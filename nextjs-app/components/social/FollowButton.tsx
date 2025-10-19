'use client'

import { useEffect, useState } from 'react'

export default function FollowButton({ targetUid }: { targetUid: string }) {
  const [loading, setLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null)

  const refresh = async () => {
    try {
      const res = await fetch(`/api/social/stats?uid=${targetUid}`, { cache: 'no-store' })
      const j = await res.json()
      if (j?.success) setIsFollowing(!!j.data?.isFollowing)
    } catch {}
  }

  useEffect(() => { refresh() }, [targetUid])

  const toggle = async () => {
    if (loading || isFollowing === null) return
    setLoading(true)
    try {
      if (!isFollowing) {
        const res = await fetch('/api/social/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUid }) })
        const j = await res.json()
        if (!res.ok || !j?.success) throw new Error('follow failed')
        setIsFollowing(true)
      } else {
        const res = await fetch(`/api/social/follow?targetUid=${targetUid}`, { method: 'DELETE' })
        const j = await res.json()
        if (!res.ok || !j?.success) throw new Error('unfollow failed')
        setIsFollowing(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={toggle} disabled={loading || isFollowing===null} className={`text-sm px-3 py-1.5 rounded-lg border ${isFollowing ? 'bg-gray-100 text-gray-700' : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'} disabled:opacity-50`}>
      {isFollowing ? '已关注' : '关注'}
    </button>
  )
}
