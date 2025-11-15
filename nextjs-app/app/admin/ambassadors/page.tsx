"use client"
import Header from '@/components/layout/Header'
import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'

// 强制动态渲染，避免构建时预渲染导致 QueryClient 错误
export const dynamic = 'force-dynamic'

interface Ambassador {
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
  metadata?: any
}
interface ContributionItem {
  id: string
  ambassador_id: string
  title: string
  detail?: string
  points?: number
  created_at: string
}

export default function AdminAmbassadorsPage() {
  const { address, isConnected, status } = useAccount()
  const { isAdmin, loading: authLoading, error: authError, refresh: refreshAdmin } = useEnsureAdminSession()
  const { show } = useToast()
  const [loading, setLoading] = useState(false)
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [mounted, setMounted] = useState(false)
  const [ambForm, setAmbForm] = useState<Partial<Ambassador>>({ status: 'active' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contribLoading, setContribLoading] = useState(false)
  const [contribMap, setContribMap] = useState<Record<string, ContributionItem[]>>({})
  const [contribForm, setContribForm] = useState<{ title: string; detail?: string; points?: number }>({ title: '' })

  useEffect(()=>{ setMounted(true) }, [])

  const loadAmbassadors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ambassadors${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ''}`)
      const j = await res.json()
      if (j.success) setAmbassadors(j.data)
      else show(j.error || '大使加载失败', { type: 'error' })
    } catch (e:any) { show(e.message || '大使加载异常', { type: 'error' }) }
    finally { setLoading(false) }
  }, [searchQ, show])

  // 在管理员认证完成后加载
  useEffect(()=>{ if (mounted && isAdmin) loadAmbassadors() }, [mounted, isAdmin, loadAmbassadors])
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

  const saveAmbassador = async () => {
    try {
      const method = ambForm.id ? 'PUT' : 'POST'
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const res = await fetch('/api/admin/ambassadors', { method, headers, body: JSON.stringify(ambForm) })
      const j = await res.json()
      if (!j.success) { show(j.error || '保存失败', { type: 'error' }); return }
      show('已保存大使', { type: 'success' })
      setAmbForm({ status: 'active' })
      loadAmbassadors()
    } catch (e:any) { show(e.message || '保存异常', { type: 'error' }) }
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
    setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: next } : x))
    try {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const res = await fetch('/api/admin/ambassadors', { method: 'PUT', headers, body: JSON.stringify({ id: amb.id, [field]: next }) })
      const j = await res.json()
      if (!j.success) {
        setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: current } : x))
        show(j.error || '更新失败', { type: 'error' })
      } else show('已更新', { type: 'success' })
    } catch (e:any) {
      setAmbassadors(prev => prev.map(x => x.id === amb.id ? { ...x, [field]: current } : x))
      show(e.message || '更新异常', { type: 'error' })
    }
  }

  const loadContrib = async (ambId: string) => {
    setContribLoading(true)
    try {
  const res = await fetch(`/api/admin/ambassadors/contributions?ambassador_id=${encodeURIComponent(ambId)}`)
      const j = await res.json()
      if (j.success) setContribMap(m => ({ ...m, [ambId]: j.data }))
      else show(j.error || '贡献记录加载失败', { type: 'error' })
    } catch (e:any) { show(e.message || '贡献记录异常', { type: 'error' }) }
    finally { setContribLoading(false) }
  }

  const submitContribution = async (ambId: string) => {
    if (!contribForm.title.trim()) { show('请输入标题', { type: 'error' }); return }
    try {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const payload = { ambassador_id: ambId, title: contribForm.title.trim(), detail: contribForm.detail || '', points: contribForm.points || 0 }
      const res = await fetch('/api/admin/ambassadors/contributions', { method: 'POST', headers, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!j.success) { show(j.error || '提交失败', { type: 'error' }); return }
      show('已添加贡献记录', { type: 'success' })
      setContribForm({ title: '' })
      loadContrib(ambId)
      // 同步刷新大使列表以更新总贡献数
      loadAmbassadors()
    } catch (e:any) { show(e.message || '提交异常', { type: 'error' }) }
  }

  const deleteContribution = async (ambId: string, item: ContributionItem) => {
    if (!confirm(`删除贡献记录「${item.title}」?`)) return
    try {
  const res = await fetch(`/api/admin/ambassadors/contributions?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      const j = await res.json()
      if (!j.success) { show(j.error || '删除失败', { type: 'error' }); return }
      show('已删除贡献记录', { type: 'success' })
      loadContrib(ambId)
      loadAmbassadors()
    } catch (e:any) { show(e.message || '删除异常', { type: 'error' }) }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">大使管理</h1>
          <p className="text-xs text-gray-500 mb-4">支持快捷增减贡献值与活动次数，并可手动登记具体贡献项目（标题 / 描述 / 分值）。</p>

          <div className="mb-4 flex items-center gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2" placeholder={'搜索大使姓名/简介'} value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
            <button onClick={()=>loadAmbassadors()} className="px-4 py-2 rounded-lg bg-primary-600 text-white">搜索</button>
            <button onClick={()=>{ setSearchQ(''); loadAmbassadors() }} className="px-4 py-2 rounded-lg border">重置</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white rounded-2xl p-5 border shadow-sm">
              <div className="text-lg font-semibold mb-4">{ambForm.id?'编辑大使':'创建大使'}</div>
              <div className="space-y-3">
                <input className="w-full border rounded-lg px-3 py-2" placeholder="姓名" value={ambForm.name||''} onChange={e=>setAmbForm(s=>({...s,name:e.target.value}))} />
                <textarea className="w-full border rounded-lg px-3 py-2" placeholder="简介" rows={3} value={ambForm.bio||''} onChange={e=>setAmbForm(s=>({...s,bio:e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="头像URL" value={ambForm.avatar||''} onChange={e=>setAmbForm(s=>({...s,avatar:e.target.value}))} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="border rounded-lg px-3 py-2" placeholder="国家" value={ambForm.country||''} onChange={e=>setAmbForm(s=>({...s,country:e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2" placeholder="城市" value={ambForm.city||''} onChange={e=>setAmbForm(s=>({...s,city:e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2" placeholder="地区(Region)" value={ambForm.region||''} onChange={e=>setAmbForm(s=>({...s,region:e.target.value}))} />
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
                  {ambForm.id && <button onClick={()=>setAmbForm({ status: 'active' })} className="px-4 py-2 rounded-lg border">重置</button>}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-4">
                {loading && ambassadors.length === 0 ? <div className="text-sm text-gray-500">加载中...</div> : null}
                {ambassadors.length === 0 && !loading ? <div className="text-sm text-gray-500 py-10 text-center">暂无大使</div> : null}
                {ambassadors.map(a => (
                  <div key={a.id} className="p-4 border rounded-xl bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
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
                        <button onClick={()=>setAmbForm(a)} className="px-3 py-1 rounded border text-xs">编辑</button>
                        <button onClick={()=>delAmb(a)} className="px-3 py-1 rounded border text-xs text-red-600">删除</button>
                        <button onClick={()=>{ setExpandedId(expandedId === a.id ? null : a.id); if (expandedId !== a.id) loadContrib(a.id) }} className="px-3 py-1 rounded border text-xs">{expandedId===a.id?'收起':'贡献记录'}</button>
                      </div>
                    </div>
                    {expandedId === a.id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="text-sm font-medium mb-3">登记贡献项目</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                          <input className="border rounded-lg px-3 py-2 md:col-span-1" placeholder="标题" value={contribForm.title} onChange={e=>setContribForm(s=>({...s,title:e.target.value}))} />
                          <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="备注(可选)" value={contribForm.detail||''} onChange={e=>setContribForm(s=>({...s,detail:e.target.value}))} />
                          <input className="border rounded-lg px-3 py-2" type="number" placeholder="分值" value={contribForm.points||''} onChange={e=>setContribForm(s=>({...s,points:Number(e.target.value||0)}))} />
                        </div>
                        <div className="flex gap-2 mb-4">
                          <button onClick={()=>submitContribution(a.id)} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-xs">提交</button>
                          <button onClick={()=>setContribForm({ title: '' })} className="px-4 py-2 rounded-lg border text-xs">重置</button>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">分值会累加至该大使的总贡献值（也可通过上方快捷按钮微调）。</div>
                        {contribLoading ? <div className="text-xs text-gray-500">加载中...</div> : (
                          <div className="space-y-2">
                            {(contribMap[a.id]||[]).length === 0 ? <div className="text-xs text-gray-400">暂无贡献记录</div> : null}
                            {(contribMap[a.id]||[]).map(item => (
                              <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded border text-xs bg-gray-50">
                                <div className="flex-1 min-w-0 pr-3">
                                  <div className="font-medium line-clamp-1">{item.title} {item.points ? <span className="text-primary-600">(+{item.points})</span> : null}</div>
                                  {item.detail ? <div className="text-[10px] text-gray-500 line-clamp-1">{item.detail}</div> : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                                  <button onClick={()=>deleteContribution(a.id, item)} className="px-2 py-0.5 rounded border text-[10px] text-red-600">删除</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
