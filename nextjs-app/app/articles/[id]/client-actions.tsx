'use client'

import { useEffect, useState, useTransition } from 'react'

export default function ClientActions({ contentId }: { contentId: string }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Fire-and-forget view tracking
    fetch('/api/content/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId }),
    }).catch(() => {})
  }, [contentId])

  const tip = () => {
    startTransition(async () => {
      setMessage(null)
      const res = await fetch('/api/content/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data?.error || '打赏失败')
      } else {
        setMessage(data?.message || '已为作者送出 1 点鼓励')
      }
    })
  }

  return (
    <div className="mt-8 flex items-center gap-3">
      <button
        onClick={tip}
        className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
        disabled={pending}
      >
        赞赏作者 +1
      </button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  )
}
