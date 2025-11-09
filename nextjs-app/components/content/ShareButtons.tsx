'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type Props = {
  title?: string
  tags?: string[]
  imageUrl?: string | null
  className?: string
}

function Icon({ name }: { name: 'x' | 'weibo' | 'telegram' | 'link' | 'qrcode' }) {
  const common = 'w-4 h-4 inline-block align-middle'
  switch (name) {
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path fill="currentColor" d="M18.3 2H21l-6.5 7.4L22 22h-6.9l-4.4-5.8L5.6 22H3l7-8L2 2h7l4 5.3L18.3 2zm-2.4 18h2.2L8.2 4H6L15.9 20z"/>
        </svg>
      )
    case 'weibo':
      return (
        <svg viewBox="0 0 1024 1024" className={common} aria-hidden>
          <path fill="currentColor" d="M747.5 397.5c-27.9-5.9-47.4-33.3-41.5-61.2 8.6-40.7 10.8-76.2-20.5-107.5-52.3-52.3-157.2 6.1-203.5 28.3-14.1 6.8-30.6 1-37.4-12.9-6.8-14 0.3-30.8 14.4-37.6 66.6-32.4 199.4-96.2 275.1-20.5 48.1 48.1 43.8 102.6 33.8 149.2-3.2 14.9-17.9 24.5-32.9 22.2zM685 442.6c-17.2-3.6-28.2-20.5-24.6-37.6 5.1-24.1 6.7-45.2-12.7-64.6-32.5-32.5-97.7 3.8-126.4 17.8-8.7 4.2-19 0.7-23.2-8-4.2-8.7 0.2-19.3 8.9-23.5 41.3-20.1 123.6-59.6 170.5-12.7 29.7 29.7 27.1 63.4 21 92.2-2 9.3-11 15.4-20.3 13.4zM390.9 373.3c-178.9 0-323.8 104.2-323.8 232.7 0 128.5 145 232.7 323.8 232.7S714.7 734.5 714.7 606c0-128.5-145-232.7-323.8-232.7zm50.8 389.8c-142.5 0-258-64.7-258-144.6 0-79.8 115.5-144.6 258-144.6s258 64.7 258 144.6c0 79.9-115.5 144.6-258 144.6z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path fill="currentColor" d="M9.035 15.45 8.9 19.3a1.3 1.3 0 0 0 1.03-.5l2.48-2.37 3.64 2.67c.67.37 1.16.18 1.35-.62l2.45-11.5c.22-1-.38-1.38-1.03-1.14L3.62 10.1c-.98.38-.96.93-.17 1.18l4.72 1.47 10.96-6.91-10.06 9.66z"/>
        </svg>
      )
    case 'link':
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path fill="currentColor" d="M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0 0 6h3v2h-3a5 5 0 0 1-5-5Zm6-1h4v2h-4v-2Zm5.1-4h3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6h-3V7Z"/>
        </svg>
      )
    case 'qrcode':
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path fill="currentColor" d="M3 3h8v8H3V3m2 2v4h4V5H5m8-2h8v8h-8V3m2 2v4h4V5h-4M3 13h8v8H3v-8m2 2v4h4v-4H5m12 0h2v2h-2v-2m-4 0h2v2h-2v-2m4 4h2v2h-2v-2m-4 0h2v2h-2v-2Z"/>
        </svg>
      )
  }
}

export default function ShareButtons({ title, tags = [], imageUrl, className }: Props) {
  const { show } = useToast()
  const [openQR, setOpenQR] = useState(false)

  const url = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.href
    return ''
  }, [])

  const shareText = useMemo(() => {
    const tagStr = tags && tags.length ? ` ${tags.map(t => `#${t}`).join(' ')}` : ''
    return `${title || ''}${tagStr}`.trim()
  }, [title, tags])

  const xUrl = useMemo(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, [shareText, url])
  const weiboUrl = useMemo(() => `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}${imageUrl ? `&pic=${encodeURIComponent(imageUrl)}` : ''}`, [shareText, url, imageUrl])
  const tgUrl = useMemo(() => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, [shareText, url])
  const qrSrc = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`, [url])

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      show('链接已复制', { type: 'success' })
    } catch {
      show('复制失败，请手动复制地址栏', { type: 'error' })
    }
  }

  const nativeShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: title || '分享', text: shareText, url })
      } catch {}
    } else {
      doCopy()
    }
  }

  return (
    <div className={className || 'mt-4 flex items-center gap-2 flex-wrap'}>
      <button onClick={nativeShare} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">系统分享</button>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Icon name="x"/> <span>分享到 X</span></a>
      <a href={weiboUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Icon name="weibo"/> <span>微博</span></a>
      <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Icon name="telegram"/> <span>Telegram</span></a>
      <button onClick={doCopy} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Icon name="link"/> <span>复制链接</span></button>
      <div className="relative">
        <button onClick={() => setOpenQR(v => !v)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Icon name="qrcode"/> <span>二维码</span></button>
        {openQR && (
          <div className="absolute z-20 mt-2 p-3 bg-white border rounded-xl shadow-lg">
            <img src={qrSrc} alt="二维码" className="w-[180px] h-[180px]" />
            <div className="mt-2 text-center text-xs text-gray-500">手机扫码分享到微信等</div>
          </div>
        )}
      </div>
    </div>
  )
}
