'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import FollowButton from '@/components/social/FollowButton'


export default function AuthorInline({ uid, name, xp, avatarUrl }: { uid: string; name: string; xp?: number; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])
  return (
    <div className="relative inline-flex items-center" ref={ref}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={`/u/${uid}`} className="inline-flex items-center gap-2 group">
        <span className="text-sm text-gray-700 group-hover:underline">{name || '用户'}</span>
      </Link>
      {open && (
        <div className="absolute left-0 top-[120%] z-20 w-72 rounded-2xl border bg-white shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate max-w-[140px]">{name || '用户'}</div>
              <div className="text-xs text-gray-500">XP {xp ?? 0}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Link href={`/u/${uid}`} className="text-xs text-gray-500 hover:underline">查看主页</Link>
            <FollowButton targetUid={uid} />
          </div>
        </div>
      )}
    </div>
  )
}
