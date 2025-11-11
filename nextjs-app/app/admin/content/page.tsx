"use client"
import Header from '@/components/layout/Header'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'

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
type Ambassador = {
  id: string
  name: string
  avatar?: string | null
  bio?: string | null
  region?: string | null
  country?: string | null
  city?: string | null
  contributions?: number
  events_hosted?: number
  twitter?: string | null
  telegram?: string | null
  discord?: string | null
  status?: string
}

export default function AdminContentPage() {
  const { address, isConnected, status } = useAccount()
  const { isAdmin, loading: authLoading, error: authError, refresh: refreshAdmin } = useEnsureAdminSession()
  const { show } = useToast()
  const [tab, setTab] = useState<'videos' | 'ambassadors'>('videos')
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [videoForm, setVideoForm] = useState<Partial<Video>>({})
  const [ambForm, setAmbForm] = useState<Partial<Ambassador>>({ status: 'active' })
  const [searchQ, setSearchQ] = useState('')
  const [mounted, setMounted] = useState(false)

  const loadVideos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/videos${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ''}`)
      const j = await res.json()
      if (j.success) setVideos(j.data)
      else show(j.error || '视频加载失败', { type: 'error' })
    } catch (e:any) {
      show(e.message || '视频加载异常', { type: 'error' })
    } finally { setLoading(false) }
  }
  const loadAmbassadors = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ambassadors${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ''}`)
      const j = await res.json()
      if (j.success) setAmbassadors(j.data)
      else show(j.error || '大使加载失败', { type: 'error' })
    } catch (e:any) {
      show(e.message || '大使加载异常', { type: 'error' })
    } finally { setLoading(false) }
  }

  useEffect(() => { setMounted(true) }, [])

  // 管理员认证完成后加载对应列表
  useEffect(() => {
    if (!mounted) return
    if (!isAdmin) return
    if (tab === 'videos') loadVideos(); else loadAmbassadors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAdmin, tab])

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
              <li>确保 <code>ADMIN_WALLETS</code> 已配置。</li>
              <li>连接管理员钱包后自动发起签名挑战。</li>
              <li>签名仅用于身份验证，不涉及资金与授权。</li>
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

  const resetVideoForm = () => setVideoForm({})
  const resetAmbForm = () => setAmbForm({ status: 'active' })

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

  const saveAmbassador = async () => {
    try {
    const method = ambForm.id ? 'PUT' : 'POST'
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const res = await fetch('/api/admin/ambassadors', { method, headers, body: JSON.stringify(ambForm) })
      const j = await res.json()
      if (!j.success) { show(j.error || '保存失败', { type: 'error' }); return }
      show('已保存大使', { type: 'success' })
      resetAmbForm(); await loadAmbassadors()
    } catch (e:any) { show(e.message || '保存异常', { type: 'error' }) }
  }

  const editVideo = (v: Video) => setVideoForm({ ...v })
  const editAmb = (a: Ambassador) => setAmbForm({ ...a })

  const delVideo = async (v: Video) => {
    if (!confirm(`删除视频「${v.title}」?`)) return
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(v.id)}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { show(j.error || '删除失败', { type: 'error' }); return }
    show('已删除视频', { type: 'success' }); loadVideos()
  }
  const delAmb = async (a: Ambassador) => {
    if (!confirm(`删除大使「${a.name}」?`)) return
    const res = await fetch(`/api/admin/ambassadors?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { show(j.error || '删除失败', { type: 'error' }); return }
    show('已删除大使', { type: 'success' }); loadAmbassadors()
  }

  const quickAdjust = async (amb: Ambassador, field: 'contributions' | 'events_hosted', delta: number) => {
    const current = Number((amb as any)[field] || 0)
    const next = Math.max(0, current + delta)
    if (next === current) return
    // optimistic update
    setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: next } as Ambassador : x))
    try {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const res = await fetch('/api/admin/ambassadors', { method: 'PUT', headers, body: JSON.stringify({ id: amb.id, [field]: next }) })
      const j = await res.json()
      if (!j.success) {
        // revert on error
        setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: current } as Ambassador : x))
        show(j.error || '更新失败', { type: 'error' })
      } else {
        show('已更新', { type: 'success' })
      }
    } catch (e: any) {
      setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: current } as Ambassador : x))
      show(e.message || '更新异常', { type: 'error' })
    }
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

  const renderVideoForm = () => (
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
  )

  const renderAmbForm = () => (
    <div className="space-y-3">
      <input className="w-full border rounded-lg px-3 py-2" placeholder="姓名" value={ambForm.name||''} onChange={e=>setAmbForm(s=>({...s,name:e.target.value}))} />
      <textarea className="w-full border rounded-lg px-3 py-2" placeholder="简介" rows={3} value={ambForm.bio||''} onChange={e=>setAmbForm(s=>({...s,bio:e.target.value}))} />
      <input className="w-full border rounded-lg px-3 py-2" placeholder="头像URL" value={ambForm.avatar||''} onChange={e=>setAmbForm(s=>({...s,avatar:e.target.value}))} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="国家" value={ambForm.country||''} onChange={e=>setAmbForm(s=>({...s,country:e.target.value}))} />
        <input className="border rounded-lg px-3 py-2" placeholder="城市" value={ambForm.city||''} onChange={e=>setAmbForm(s=>({...s,city:e.target.value}))} />
        <input className="border rounded-lg px-3 py-2" placeholder="地区(Region)" value={ambForm.region||''} onChange={e=>setAmbForm(s=>({...s,region:e.target.value}))} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Twitter" value={ambForm.twitter||''} onChange={e=>setAmbForm(s=>({...s,twitter:e.target.value}))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Telegram" value={ambForm.telegram||''} onChange={e=>setAmbForm(s=>({...s,telegram:e.target.value}))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Discord" value={ambForm.discord||''} onChange={e=>setAmbForm(s=>({...s,discord:e.target.value}))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="贡献值" type="number" value={ambForm.contributions||0} onChange={e=>setAmbForm(s=>({...s,contributions:Number(e.target.value||0)}))} />
        <input className="border rounded-lg px-3 py-2" placeholder="活动次数" type="number" value={ambForm.events_hosted||0} onChange={e=>setAmbForm(s=>({...s,events_hosted:Number(e.target.value||0)}))} />
      </div>
      <select className="w-full border rounded-lg px-3 py-2" value={ambForm.status||'active'} onChange={e=>setAmbForm(s=>({...s,status:e.target.value}))}>
        <option value="active">active</option>
        <option value="inactive">inactive</option>
      </select>
      <div className="flex gap-2 mt-2">
        <button onClick={saveAmbassador} className="px-4 py-2 rounded-lg bg-primary-600 text-white">{ambForm.id ? '更新' : '保存'}</button>
        {ambForm.id && <button onClick={resetAmbForm} className="px-4 py-2 rounded-lg border">重置</button>}
      </div>
    </div>
  )

  const videoList = (
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
            <button onClick={()=>editVideo(v)} className="px-3 py-1 rounded border text-xs">编辑</button>
            <button onClick={()=>delVideo(v)} className="px-3 py-1 rounded border text-xs text-red-600">删除</button>
          </div>
        </div>
      ))}
    </div>
  )

  const ambList = (
    <div className="space-y-4">
      {loading && ambassadors.length === 0 ? <div className="text-sm text-gray-500">加载中...</div> : null}
      {ambassadors.length === 0 && !loading ? <div className="text-sm text-gray-500 py-10 text-center">暂无大使</div> : null}
      {ambassadors.map(a => (
        <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-xl bg-white shadow-sm">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white relative">
            {a.avatar ? (
              <Image src={a.avatar} alt={a.name} fill unoptimized className="object-cover" />
            ) : (
              <span className="font-semibold text-md">{a.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold line-clamp-1 flex items-center gap-2">
              <span>{a.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${a.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{a.status||'active'}</span>
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">{[a.city,a.country].filter(Boolean).join(', ')}</div>
            <div className="mt-2 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500">贡献:</span>
                <span className="font-semibold">{a.contributions || 0}</span>
                <div className="flex gap-0.5 ml-1">
                  {[1,5,10].map(n => (
                    <button key={n} onClick={()=>quickAdjust(a,'contributions',n)} className="px-1.5 py-0.5 text-[10px] rounded bg-primary-50 text-primary-700 hover:bg-primary-100">+{n}</button>
                  ))}
                  {[1,5,10].map(n => (
                    <button key={`-${n}`} onClick={()=>quickAdjust(a,'contributions',-n)} className="px-1.5 py-0.5 text-[10px] rounded bg-red-50 text-red-600 hover:bg-red-100">-{n}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500">活动:</span>
                <span className="font-semibold">{a.events_hosted || 0}</span>
                <div className="flex gap-0.5 ml-1">
                  {[1,3,5].map(n => (
                    <button key={n} onClick={()=>quickAdjust(a,'events_hosted',n)} className="px-1.5 py-0.5 text-[10px] rounded bg-primary-50 text-primary-700 hover:bg-primary-100">+{n}</button>
                  ))}
                  {[1,3,5].map(n => (
                    <button key={`e-${n}`} onClick={()=>quickAdjust(a,'events_hosted',-n)} className="px-1.5 py-0.5 text-[10px] rounded bg-red-50 text-red-600 hover:bg-red-100">-{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <button onClick={()=>editAmb(a)} className="px-3 py-1 rounded border text-xs">编辑</button>
            <button onClick={()=>delAmb(a)} className="px-3 py-1 rounded border text-xs text-red-600">删除</button>
          </div>
        </div>
      ))}
    </div>
  )

  const searchBar = (
    <div className="mb-4 flex items-center gap-2">
      <input className="flex-1 border rounded-lg px-3 py-2" placeholder={tab==='videos'?'搜索视频标题/内容':'搜索大使姓名/简介'} value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
      <button
        onClick={()=>{
          if (tab === 'videos') {
            loadVideos()
          } else {
            loadAmbassadors()
          }
        }}
        className="px-4 py-2 rounded-lg bg-primary-600 text-white"
      >搜索</button>
      <button
        onClick={()=>{
          setSearchQ('')
          if (tab === 'videos') {
            loadVideos()
          } else {
            loadAmbassadors()
          }
        }}
        className="px-4 py-2 rounded-lg border"
      >重置</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">内容管理</h1>
          <p className="text-xs text-gray-500 mb-4">支持视频封面自动解析（YouTube 与 Bilibili），以及大使贡献与活动数快捷调整。</p>
          <div className="flex gap-3 mb-8">
            <button onClick={()=>setTab('videos')} className={`px-4 py-2 rounded-full text-sm ${tab==='videos'?'bg-primary-600 text-white':'bg-white border'}`}>视频</button>
            <button onClick={()=>setTab('ambassadors')} className={`px-4 py-2 rounded-full text-sm ${tab==='ambassadors'?'bg-primary-600 text-white':'bg-white border'}`}>大使</button>
          </div>
          {searchBar}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white rounded-2xl p-5 border shadow-sm">
              <div className="text-lg font-semibold mb-4">{tab==='videos' ? (videoForm.id?'编辑视频':'创建视频') : (ambForm.id?'编辑大使':'创建大使')}</div>
              {tab==='videos' ? renderVideoForm() : renderAmbForm()}
            </div>
            <div className="md:col-span-2">
              {tab==='videos' ? videoList : ambList}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
