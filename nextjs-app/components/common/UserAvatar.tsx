'use client'

import React from 'react'

type Props = {
  url?: string | null
  name?: string | null
  size?: number
  className?: string
  rounded?: 'full' | 'lg' | 'md'
}

export default function UserAvatar({ url, name, size = 40, className, rounded = 'full' }: Props) {
  const style: React.CSSProperties = { width: size, height: size }
  const r = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'
  const letter = (name || '').trim().slice(0,1).toUpperCase() || 'U'
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || ''
  const src = url || fallback
  return (
    <div className={`overflow-hidden border bg-gray-100 ${r} ${className||''}`} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-700 text-sm">{letter}</div>
      )}
    </div>
  )
}
