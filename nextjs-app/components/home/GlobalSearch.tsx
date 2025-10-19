'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function GlobalSearch() {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (sp?.get('q')) setQ(sp.get('q') || '')
  }, [sp])

  const submit = () => {
    const qq = q.trim()
    if (!qq) return
    router.push(`/search?q=${encodeURIComponent(qq)}&type=all`)
  }

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="搜索文章 / 视频 / 大使 / 用户"
              className="w-full rounded-2xl border px-5 py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={submit}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
            >搜索</button>
          </div>
        </div>
      </div>
    </section>
  )
}
