"use client"

export const dynamic = 'force-dynamic'
import Header from '@/components/layout/Header'
import Image from 'next/image'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Skeleton } from '@/components/ui/Skeleton'
import { refresh } from '@/lib/env'

export default function DynamicsPage() {
  const { data: session } = useSession()
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {session?.user && <Composer />}
          <Suspense fallback={<div className="text-sm text-gray-500">加载中...</div>}>
            <FeedList />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

function Composer() {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const onSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploads: string[] = []
      const limit = Math.min(9, files.length)
      for (let i=0;i<limit;i++) {
        const fd = new FormData()
        fd.append('file', files[i])
        const res = await fetch('/api/social/upload', { method: 'POST', body: fd })
        const j = await res.json()
        if (j?.success && j.url) uploads.push(j.url)
      }
      setImages(prev => [...prev, ...uploads].slice(0, 9))
    } finally {
      setUploading(false)
    }
  }
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 mb-6">
      <textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="分享新鲜事..." rows={3} />
      {images.length>0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative w-full h-24 rounded-lg border overflow-hidden">
              <Image src={url} alt="img" fill unoptimized className="object-cover" />
              <button className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs" onClick={()=> setImages(prev => prev.filter((_,i)=>i!==idx))}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <label className="text-sm text-primary-600 hover:underline cursor-pointer">
          <input type="file" accept="image/*" multiple className="hidden" onChange={e=>onSelect(e.target.files)} />
          {uploading ? '上传中...' : '添加图片'}
        </label>
        <button disabled={(!content.trim() && images.length===0) || posting} onClick={async ()=>{
          setPosting(true)
          try {
            const res = await fetch('/api/social/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.trim(), images }) })
            const j = await res.json()
            if (j?.success) {
              setContent('')
              setImages([])
              window.dispatchEvent(new CustomEvent('feed:refresh'))
            }
          } finally {
            setPosting(false)
          }
        }} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">发布</button>
      </div>
    </div>
  )
}

function FeedList() {
  const [items, setItems] = useState<any[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, { username?: string | null; avatar_url?: string | null }>>({})
  const sp = useSearchParams()
  const uid = sp?.get('uid') || ''
  const [mode, setMode] = useState<'all' | 'following'>('all')
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [commentOpenFor, setCommentOpenFor] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [commentCursors, setCommentCursors] = useState<Record<string, string | null>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<{ urls: string[], index: number } | null>(null)

  // Refs to avoid unstable dependencies and stale closures
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { cursorRef.current = cursor }, [cursor])

  const load = useCallback(async (reset = false) => {
    if (loadingRef.current && !reset) return
    loadingRef.current = true
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (uid) params.set('uid', uid)
      if (!uid && mode === 'following') params.set('following', '1')
      const before = !reset ? cursorRef.current : null
      if (before) params.set('before', before)
      const res = await fetch(`/api/social/posts?${params.toString()}`, { cache: 'no-store' })
      const j = await res.json().catch(() => null)
      if (j?.success) {
        setItems(prev => (reset ? j.items : [...prev, ...j.items]))
        setCursor(j.nextCursor || null)
        setHasMore(!!j.hasMore)
        setProfiles(prev => ({ ...prev, ...(j.profiles || {}) }))
        // Fallback: fetch likes for the first page or when reset; for pagination, compute after state update
        const ids = (reset ? j.items : undefined)?.map((it: any) => it.id)
        if (Array.isArray(ids) && ids.length > 0) {
          const res2 = await fetch(`/api/social/likes?ids=${ids.join(',')}`, { cache: 'no-store' })
          const j2 = await res2.json().catch(() => null)
          if (j2?.success) {
            setLikeCounts(j2.counts || {})
            setLikedSet(new Set<string>(j2.liked || []))
          }
        }
      }
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [uid, mode])

  // Initial/param changes refresh
  useEffect(() => { load(true) }, [uid, mode, load])
  // External refresh trigger
  useEffect(() => {
    const h = () => load(true)
    window.addEventListener('feed:refresh', h)
    return () => window.removeEventListener('feed:refresh', h)
  }, [load])

  // 全局自动刷新（基于配置，可选开启）+ 聚焦/网络重连再验证
  useEffect(() => {
    let timer: any
    if (refresh.enabled && refresh.intervalMs > 0) {
      timer = setInterval(() => load(true), refresh.intervalMs)
    }
    const onVisibility = () => {
      if (refresh.onFocus && document.visibilityState === 'visible' && refresh.enabled) {
        load(true)
      }
    }
    const onOnline = () => {
      if (refresh.onReconnect && refresh.enabled) {
        load(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [uid, mode, load])

  return (
    <div className="space-y-3">
      {!uid && (
        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1.5 rounded-lg border ${mode==='all'?'bg-gray-100':''}`} onClick={()=> setMode('all')}>全部</button>
          <button className={`px-3 py-1.5 rounded-lg border ${mode==='following'?'bg-gray-100':''}`} onClick={()=> setMode('following')}>只看关注</button>
        </div>
      )}
      {loading && items.length === 0 && <FeedSkeleton />}
      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500 rounded-2xl border bg-white p-6 text-center">
          暂无动态内容
        </div>
      )}
      {items.map(it => {
        const profile = profiles[it.user_uid] || {}
        const displayName = profile.username || '用户'
        const avatarUrl = profile.avatar_url || null
        return (
          <div key={it.id} className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <a href={`/u/${it.user_uid}`} className="flex items-center gap-2 group">
              {avatarUrl ? (
                <div className="w-8 h-8 rounded-full border overflow-hidden relative">
                  <Image src={avatarUrl} alt={displayName} fill unoptimized className="object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-semibold">
                  {displayName.slice(0,1)}
                </div>
              )}
              <span className="text-sm text-gray-700 group-hover:underline">{displayName}</span>
            </a>
            <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-6">{it.content}</div>
          {Array.isArray(it.images) && it.images.length>0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {it.images.map((url:string, idx:number) => (
                <div key={idx} className="relative w-full h-28 rounded-lg border overflow-hidden cursor-zoom-in" onClick={()=> setLightbox({ urls: it.images, index: idx })}>
                  <Image src={url} alt="img" fill unoptimized className="object-cover" />
                </div>
              ))}
            </div>
          )}
          {/* Actions */}
          <div className="mt-3 border-t pt-3 flex items-center justify-center gap-6 text-sm text-gray-600">
            <button aria-label="点赞" className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${likedSet.has(it.id)?'bg-pink-50 border-pink-200 text-pink-700':'hover:bg-gray-50'}`} onClick={async ()=>{
              const res = await fetch('/api/social/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: it.id }) })
              const j = await res.json()
              if (j?.success) {
                setLikeCounts(prev => ({ ...prev, [it.id]: j.likes }))
                setLikedSet(prev => {
                  const n = new Set(prev)
                  if (j.liked) n.add(it.id); else n.delete(it.id)
                  return n
                })
              }
            }}>
              {likedSet.has(it.id) ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-pink-600"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-primary-600"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
              )}
              <span className="min-w-[1.5ch] text-gray-700">{likeCounts[it.id] || 0}</span>
            </button>
            <button
              aria-label="评论"
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:bg-gray-50"
              onClick={() => {
                const nextOpen = commentOpenFor === it.id ? null : it.id
                setCommentOpenFor(nextOpen)
                if (nextOpen && !comments[it.id]) {
                  fetch(`/api/social/comments?postId=${it.id}&limit=10`, { cache: 'no-store' })
                    .then(r => r.json())
                    .then(j => {
                      if (j?.success) {
                        setComments(prev => ({ ...prev, [it.id]: j.items }))
                        setCommentCursors(prev => ({ ...prev, [it.id]: j.nextCursor || null }))
                      }
                    })
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-primary-600"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
              <span>评论</span>
            </button>
          </div>
          {/* Comment box */}
          {commentOpenFor === it.id && (
            <div className="mt-3 border-t pt-3">
              <div className="space-y-2">
                {(comments[it.id] || []).map((c:any)=> (
                  <div key={c.id} className="text-sm">
                    <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                    <div className="whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))}
                {(commentCursors[it.id]) && (
                  <button className="text-xs text-gray-500 hover:underline" onClick={async ()=>{
                    const cur = commentCursors[it.id]
                    const res = await fetch(`/api/social/comments?postId=${it.id}&limit=10${cur?`&before=${encodeURIComponent(cur)}`:''}`, { cache: 'no-store' })
                    const j = await res.json()
                    if (j?.success) {
                      setComments(prev=> ({ ...prev, [it.id]: [...(prev[it.id]||[]), ...j.items] }))
                      setCommentCursors(prev=> ({ ...prev, [it.id]: j.nextCursor || null }))
                    }
                  }}>加载更多评论</button>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={commentInput[it.id] || ''} onChange={e=> setCommentInput(prev=> ({ ...prev, [it.id]: e.target.value }))} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="写评论..." />
                <button className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm" onClick={async ()=>{
                  const text = (commentInput[it.id] || '').trim()
                  if (!text) return
                  const res = await fetch('/api/social/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: it.id, content: text }) })
                  const j = await res.json()
                  if (j?.success) {
                    setCommentInput(prev=> ({ ...prev, [it.id]: '' }))
                    // refresh first page
                    const res2 = await fetch(`/api/social/comments?postId=${it.id}&limit=10`, { cache: 'no-store' })
                    const j2 = await res2.json()
                    if (j2?.success) {
                      setComments(prev=> ({ ...prev, [it.id]: j2.items }))
                      setCommentCursors(prev=> ({ ...prev, [it.id]: j2.nextCursor || null }))
                    }
                  }
                }}>发送</button>
              </div>
            </div>
          )}
          </div>
        )
      })}
  {loading && items.length > 0 && <div className="text-sm text-gray-500">加载中...</div>}
      {hasMore && !loading && <button onClick={()=>load(false)} className="text-primary-600 hover:underline text-sm">加载更多</button>}
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={()=> setLightbox(null)}>
          <div className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto">
            <Image src={lightbox.urls[lightbox.index]} alt="preview" width={1200} height={800} unoptimized className="object-contain w-full h-full" />
          </div>
        </div>
      )}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton height={32} width={32} radius="9999px" className="border" />
            <div className="flex-1">
              <Skeleton height={12} width="30%" className="mb-2" />
              <Skeleton height={10} width="20%" />
            </div>
          </div>
          <Skeleton height={12} className="mb-2" />
          <Skeleton height={12} width="80%" className="mb-2" />
          <Skeleton height={12} width="60%" />
        </div>
      ))}
    </div>
  )
}
