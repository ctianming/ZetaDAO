"use client"
// Removed unused Header import
import NextImage from 'next/image'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useSession } from 'next-auth/react'
import { useUserStore } from '@/stores/userStore'

type Props = {
  avatarUrl?: string | null
  username?: string | null
  isSelf: boolean
  size?: number // px, default 64
  className?: string
  onUpdated?: (url: string) => void
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export default function AvatarEditor({ avatarUrl, username, isSelf, size = 64, className, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [imgNatural, setImgNatural] = useState<{w:number,h:number}|null>(null)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState<{x:number,y:number}>({ x: 0, y: 0 }) // viewport px (top-left of image)
  // Responsive square viewport size determined from container
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState(240)
  const [saving, setSaving] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string | null>(avatarUrl || null)
  const pinchLastDist = useRef<number | null>(null)
  const { show } = useToast()
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const firstFocusableRef = useRef<HTMLInputElement | null>(null)
  const [animIn, setAnimIn] = useState(false)
  const [centerPending, setCenterPending] = useState(false)
  
  // 用于更新会话和全局状态
  const { update } = useSession()
  const setAvatar = useUserStore((state) => state.setAvatar)

  const displayUrl = useMemo(() => {
    return currentUrl || (process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || '') || ''
  }, [currentUrl])

  const dimensionStyle: React.CSSProperties = { width: size, height: size }

  function onClickEdit() {
    if (!isSelf) return
    setOpen(true)
    setTimeout(() => setAnimIn(true), 0)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    if (f && f.size > 3 * 1024 * 1024) {
      show('图片大小不能超过 3MB', { type: 'error' })
      return
    }
    setFile(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setPreview(url)
      // reset crop state
      setZoom(1)
      setPos({ x: 0, y: 0 })
      setImgEl(null)
      setImgNatural(null)
      setCenterPending(true)
    } else setPreview(null)
  }

  async function onSave() {
    if (!file || !imgNatural) { setOpen(false); return }
    try {
      setSaving(true)
      // Compute crop source rect based on ACTUAL rendered geometry
  const cont = containerRef.current!
  const imgNode = imgEl!
  const vb = getContentRect(cont)
      const ib = imgNode.getBoundingClientRect()
      const scaleX = imgNatural.w / ib.width
      const scaleY = imgNatural.h / ib.height
      let sx = (vb.left - ib.left) * scaleX
      let sy = (vb.top - ib.top) * scaleY
      let sw = vb.width * scaleX
      let sh = vb.height * scaleY
      // Clamp to image bounds
      sx = Math.max(0, sx)
      sy = Math.max(0, sy)
      sw = Math.min(sw, imgNatural.w - sx)
      sh = Math.min(sh, imgNatural.h - sy)
      // render to canvas 512x512 and export webp
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0,0,size,size)
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
          resolve()
        }
        img.src = preview || ''
      })
      const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b!), 'image/webp', 0.9))
      const processed = new File([blob], (file.name || 'avatar').replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
      const fd = new FormData()
      fd.append('file', processed)
      fd.append('filename', processed.name)
      const res = await fetch('/api/user/avatar', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok || !j?.success || !j?.url) {
        show(j?.error || '上传失败', { type: 'error' })
        return
      }
      const bust = `${j.url}${j.url.includes('?') ? '&' : '?'}t=${Date.now()}`
      setCurrentUrl(bust)
      
      // 立即更新全局 userStore 中的头像
      setAvatar(bust)
      
      // 触发 next-auth 会话更新，这会重新从服务器获取最新的用户信息
      // 并通过 SessionSyncProvider 自动同步到 userStore
      try {
        await update()
      } catch (e) {
        console.error('Failed to update session:', e)
      }
      
      closeModal()
      setFile(null)
      setPreview(null)
      setImgEl(null)
      onUpdated?.(bust)
      
      // 保留自定义事件以兼容可能依赖它的旧代码
      try { window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: bust } })) } catch {}
    } catch (e) {
      show('上传失败', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Initial fallback letter
  const fallbackLetter = (username || '用').slice(0, 1)

  // Measure container width to drive responsive viewport size
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(() => {
      const w = Math.max(160, Math.min(360, el.clientWidth)) // 160–360px
      setViewportSize(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  // Utility to clamp a value
  function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

  // Compute base scale (fit short edge), then derived scale with zoom
  const currentScale = useMemo(() => {
    if (!imgNatural) return 1
    const base = viewportSize / Math.min(imgNatural.w, imgNatural.h)
    return base * zoom
  }, [imgNatural, viewportSize, zoom])

  // Constrain position so the image always covers the viewport
  useEffect(() => {
    if (!imgNatural) return
    const dispW = imgNatural.w * currentScale
    const dispH = imgNatural.h * currentScale
    const minX = Math.min(0, viewportSize - dispW)
    const minY = Math.min(0, viewportSize - dispH)
    setPos(p => ({
      x: clamp(p.x, minX, 0),
      y: clamp(p.y, minY, 0),
    }))
  }, [imgNatural, currentScale, viewportSize])

  // Center image when it first loads
  function centerImage() {
    if (!imgNatural) return
    const dispW = imgNatural.w * currentScale
    const dispH = imgNatural.h * currentScale
    setPos({ x: (viewportSize - dispW) / 2, y: (viewportSize - dispH) / 2 })
  }

  // Live small preview (128x128) thumbnail
  useEffect(() => {
    if (!preview || !imgNatural || !containerRef.current || !imgEl) { setThumbUrl(null); return }
  const raf = requestAnimationFrame(() => {
      const vb = getContentRect(containerRef.current!)
      const ib = imgEl!.getBoundingClientRect()
      const scaleX = imgNatural.w / ib.width
      const scaleY = imgNatural.h / ib.height
      let sx = (vb.left - ib.left) * scaleX
      let sy = (vb.top - ib.top) * scaleY
      let sw = vb.width * scaleX
      let sh = vb.height * scaleY
      sx = Math.max(0, sx); sy = Math.max(0, sy)
      sw = Math.min(sw, imgNatural.w - sx); sh = Math.min(sh, imgNatural.h - sy)
      const size = 128
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
        setThumbUrl(canvas.toDataURL('image/webp', 0.8))
      }
      img.src = preview
    })
    return () => cancelAnimationFrame(raf)
  }, [preview, imgNatural, imgEl, viewportSize, zoom, pos.x, pos.y])

  // Modal: focus management, keyboard, and scroll lock
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!saving) closeModal() }
      if (e.key === 'Enter') { if (file && preview && !saving) onSave() }
      if (e.key === 'Tab' && panelRef.current) {
        // simple focus trap
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    // Autofocus file input
    firstFocusableRef.current?.focus()
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saving, file, preview])

  function closeModal() {
    setAnimIn(false)
    setTimeout(() => setOpen(false), 150)
  }

  // Compute content-box rect (remove borders and paddings) for accurate crop area
  function getContentRect(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const bl = parseFloat(cs.borderLeftWidth||'0')
    const br = parseFloat(cs.borderRightWidth||'0')
    const bt = parseFloat(cs.borderTopWidth||'0')
    const bb = parseFloat(cs.borderBottomWidth||'0')
    const pl = parseFloat(cs.paddingLeft||'0')
    const pr = parseFloat(cs.paddingRight||'0')
    const pt = parseFloat(cs.paddingTop||'0')
    const pb = parseFloat(cs.paddingBottom||'0')
    const left = r.left + bl + pl
    const top = r.top + bt + pt
    const width = Math.max(0, r.width - bl - br - pl - pr)
    const height = Math.max(0, r.height - bt - bb - pt - pb)
    return { left, top, width, height }
  }

  return (
    <>
      <div
        className={classNames('relative group rounded-full overflow-hidden border border-gray-200 bg-gray-100', isSelf && 'cursor-pointer', className)}
        style={dimensionStyle}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="avatar"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl font-bold">
            {fallbackLetter}
          </div>
        )}

        {isSelf && (
          <button
            type="button"
            onClick={onClickEdit}
            className="absolute inset-0 hidden group-hover:flex group-focus-within:flex items-center justify-center bg-black/45 text-white text-sm select-none"
            aria-label="更换头像"
          >
            更换头像
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50" data-open={animIn}>
          <div className={classNames('absolute inset-0 bg-black/40 transition-opacity duration-150', animIn ? 'opacity-100' : 'opacity-0')} onClick={() => !saving && closeModal()} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div ref={panelRef} className={classNames('w-full max-w-lg rounded-2xl bg-white shadow-lg border p-5 transition-all duration-150', animIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95')} role="dialog" aria-modal="true" aria-label="更换头像">
              <div className="text-base font-medium mb-3">更换头像</div>
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onFileChange}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    ref={firstFocusableRef}
                  />
                </div>
                <div className="text-xs text-gray-500">支持 JPG/PNG/WebP（≤3MB）。选择图片后将出现裁剪与缩放；可拖拽调整位置，滚轮/双指缩放。</div>

                {/* Crop Stage - appears only after selecting a file */}
                <div className={classNames(!preview && 'hidden')}>
                  <div
                    ref={containerRef}
                    className="rounded-xl border bg-gray-50 overflow-hidden touch-none select-none mx-auto relative"
                    style={{ width: 'min(80vw, 360px)', height: 'min(80vw, 360px)' }}
                    onWheel={(e)=>{
                      if (!preview) return
                      e.preventDefault()
                      const next = clamp(zoom + (-e.deltaY/500), 1, 4)
                      setZoom(next)
                    }}
                    onMouseDown={(e)=>{ if (!preview) return; setDragging(true); (e.currentTarget as any)._last={x:e.clientX,y:e.clientY} }}
                    onMouseMove={(e)=>{ if (!dragging) return; const last=(e.currentTarget as any)._last; const dx=e.clientX-last.x, dy=e.clientY-last.y; setPos(p=>({x:p.x+dx,y:p.y+dy})); (e.currentTarget as any)._last={x:e.clientX,y:e.clientY} }}
                    onMouseUp={()=>setDragging(false)}
                    onMouseLeave={()=>setDragging(false)}
                    onTouchStart={(e)=>{
                      if (!preview) return
                      if (e.touches.length === 2) {
                        const [a,b] = [e.touches[0], e.touches[1]]
                        pinchLastDist.current = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY)
                        setDragging(false)
                        return
                      }
                      setDragging(true)
                      const t=e.touches[0]; (e.currentTarget as any)._last={x:t.clientX,y:t.clientY}
                    }}
                    onTouchMove={(e)=>{
                      if (!preview) return
                      if (e.touches.length === 2) {
                        const [a,b] = [e.touches[0], e.touches[1]]
                        const dist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY)
                        if (pinchLastDist.current) {
                          const delta = (dist - pinchLastDist.current) / 200
                          setZoom(z => clamp(z + delta, 1, 4))
                        }
                        pinchLastDist.current = dist
                        return
                      }
                      if (!dragging) return
                      const t=e.touches[0]
                      const wrap=e.currentTarget as any
                      const last=wrap._last
                      const dx=t.clientX-last.x, dy=t.clientY-last.y
                      setPos(p=>({x:p.x+dx,y:p.y+dy}))
                      wrap._last={x:t.clientX,y:t.clientY}
                    }}
                    onTouchEnd={(e)=>{
                      if (e.touches.length < 2) pinchLastDist.current = null
                      setDragging(false)
                    }}
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="裁剪预览"
                        ref={(el)=>{
                          if (el && !imgEl) {
                            setImgEl(el)
                            el.onload = () => {
                              setImgNatural({ w: el.naturalWidth, h: el.naturalHeight })
                              // center after we know natural size
                              if (centerPending) setTimeout(() => { centerImage(); setCenterPending(false) }, 0)
                            }
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          transform: `translate(${pos.x}px, ${pos.y}px) scale(${currentScale})`,
                          transformOrigin: 'top left',
                          willChange: 'transform',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null}
                    {/* Overlay mask + grid */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        boxShadow: '0 0 0 9999px rgba(0,0,0,.35) inset',
                        borderRadius: '0.75rem'
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 opacity-40" style={{
                      backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
                      backgroundSize: 'calc(100%/3) calc(100%/3)'
                    }} />
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="text-xs text-gray-600 w-12">缩放</div>
                    <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} className="flex-1" />
                  </div>

                  {/* Live preview thumbnail */}
                  {thumbUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="text-xs text-gray-600 w-12">预览</div>
                      <div className="relative w-16 h-16 rounded-full border overflow-hidden">
                        <NextImage src={thumbUrl} alt="缩略预览" fill unoptimized className="object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !saving && closeModal()}
                  className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className={classNames('px-3 py-2 text-sm rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60', saving && 'cursor-not-allowed')}
                  disabled={saving || !file || !preview}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
