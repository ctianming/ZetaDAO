"use client"
import Header from '@/components/layout/Header'
import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'

// 强制动态渲染，避免构建时预渲染导致 QueryClient 错误
export const dynamic = 'force-dynamic'

type Video = {
  id: string
  title: string
  content?: string
  image_url?: string | null
  video_url?: string | null
  external_url?: string | null
  tags?: string[]
  published_at?: string
}

export default function AdminVideosPage() {
  const { address, isConnected, status } = useAccount()
  const { isAdmin, loading: authLoading, error: authError, refresh: refreshAdmin } = useEnsureAdminSession()
  const { show } = useToast()
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [videoForm, setVideoForm] = useState<Partial<Video>>({})
  const [searchQ, setSearchQ] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(()=>{ setMounted(true) }, [])

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/videos${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ''}`)
      const j = await res.json()
      if (j.success) setVideos(j.data)
      else show(j.error || '视频加载失败', { type: 'error' })
    } catch (e:any) { show(e.message || '视频加载异常', { type: 'error' }) }
    finally { setLoading(false) }
  }, [searchQ, show])

  // 在管理员认证完成后加载列表
  useEffect(() => { if (mounted && isAdmin) loadVideos() }, [mounted, isAdmin, loadVideos])

  const resetVideoForm = () => setVideoForm({})

  const saveVideo = async () => {
    try {
      const method = videoForm.id ? 'PUT' : 'POST'
      const payload = { ...videoForm, tags: videoForm.tags }
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const res = await fetch('/api/admin/videos', { method, headers, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!j.success) { show(j.error || '保存失败', { type: 'error' }); return }
      show('已保存视频', { type: 'success' })
      resetVideoForm(); await loadVideos()
    } catch (e:any) { show(e.message || '保存异常', { type: 'error' }) }
  }

  const delVideo = async (v: Video) => {
    if (!confirm(`删除视频「${v.title}」?`)) return
  const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(v.id)}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { show(j.error || '删除失败', { type: 'error' }); return }
    show('已删除视频', { type: 'success' }); loadVideos()
  }

  const applyResolveCover = async () => {
    const url = videoForm.video_url || videoForm.external_url
    if (!url) { show('请先填写视频链接', { type: 'error' }); return }
    const res = await fetch('/api/admin/videos/resolve-cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    const j = await res.json()
    if (!j.success) { show(j.error || '解析失败', { type: 'error' }); return }
    setVideoForm(s => ({ ...s, image_url: j.image_url || j.fallback_image_url, title: s.title || j.title }))
    show('已解析封面', { type: 'success' })
  }

  if (!mounted) return null
  if (!isConnected || !address || status !== 'connected') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-center text-sm text-muted-foreground">{status === 'disconnected' ? '请先连接管理员钱包后再访问后台。' : '正在检查管理员权限，请稍候...'}</p>
        </main>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-center text-sm text-muted-foreground">正在进行管理员签名认证...</p>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-4">管理员访问指引</h1>
            <ol className="space-y-3 text-sm list-decimal list-inside mb-4">
              <li>确保 <code>ADMIN_WALLETS</code> 已在服务端环境变量中配置。</li>
              <li>右上角连接目标管理员钱包地址。</li>
              <li>系统会自动发起“挑战签名”流程；签名仅用于身份确认，不涉及资金。</li>
              <li>若签名弹窗未出现，可点击下方“重新认证”。</li>
            </ol>
            {authError && <div className="text-xs text-red-600 mb-3">{authError}</div>}
            <div className="flex gap-3">
              <button onClick={() => refreshAdmin()} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">重新认证</button>
              <button onClick={() => location.reload()} className="px-4 py-2 rounded-lg border text-sm">刷新页面</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">视频管理</h1>
          <p className="text-xs text-gray-500 mb-4">支持视频封面自动解析（YouTube 与 Bilibili）。</p>

          <div className="mb-4 flex items-center gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2" placeholder={'搜索视频标题/内容'} value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
            <button onClick={()=>loadVideos()} className="px-4 py-2 rounded-lg bg-primary-600 text-white">搜索</button>
            <button onClick={()=>{ setSearchQ(''); loadVideos() }} className="px-4 py-2 rounded-lg border">重置</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white rounded-2xl p-5 border shadow-sm">
              <div className="text-lg font-semibold mb-4">{videoForm.id?'编辑视频':'创建视频'}</div>
              <div className="space-y-3">
                <input className="w-full border rounded-lg px-3 py-2" placeholder="标题" value={videoForm.title||''} onChange={e=>setVideoForm(s=>({...s,title:e.target.value}))} />
                <textarea className="w-full border rounded-lg px-3 py-2" placeholder="简介(可选)" rows={3} value={videoForm.content||''} onChange={e=>setVideoForm(s=>({...s,content:e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="视频URL (YouTube/Bilibili)" value={videoForm.video_url||''} onChange={e=>setVideoForm(s=>({...s,video_url:e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="外部访问URL(备用)" value={videoForm.external_url||''} onChange={e=>setVideoForm(s=>({...s,external_url:e.target.value}))} />
                <div className="flex gap-2 items-center">
                  <input className="flex-1 border rounded-lg px-3 py-2" placeholder="封面图片URL" value={videoForm.image_url||''} onChange={e=>setVideoForm(s=>({...s,image_url:e.target.value}))} />
                  <button type="button" onClick={applyResolveCover} className="px-3 py-2 rounded border text-xs">自动解析</button>
                </div>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="标签(逗号分隔)" value={(videoForm.tags||[]).join(',')} onChange={e=>setVideoForm(s=>({...s,tags:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))} />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveVideo} className="px-4 py-2 rounded-lg bg-primary-600 text-white">{videoForm.id ? '更新' : '保存'}</button>
                  {videoForm.id && <button onClick={resetVideoForm} className="px-4 py-2 rounded-lg border">重置</button>}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-4">
                {loading && videos.length === 0 ? <div className="text-sm text-gray-500">加载中...</div> : null}
                {videos.length === 0 && !loading ? <div className="text-sm text-gray-500 py-10 text-center">暂无视频</div> : null}
                {videos.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-4 border rounded-xl bg-white shadow-sm">
                    <div className="w-28 h-16 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center relative">
                      {v.image_url ? (
                        <Image src={v.image_url} alt={v.title} fill unoptimized className="object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">无封面</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{v.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{v.video_url || v.external_url}</div>
                      {v.tags?.length ? <div className="mt-1 flex flex-wrap gap-1">{v.tags.map(t => <span key={t} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[11px] rounded">{t}</span>)}</div> : null}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setVideoForm(v)} className="px-3 py-1 rounded border text-xs">编辑</button>
                      <button onClick={()=>delVideo(v)} className="px-3 py-1 rounded border text-xs text-red-600">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
