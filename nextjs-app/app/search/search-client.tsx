"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Tab = 'all' | 'article' | 'video' | 'ambassador' | 'user'

function TabNav({ active, counts, onChange }: { active: Tab; counts: Partial<Record<Tab, number>>; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '综合' },
    { key: 'video', label: '视频' },
    { key: 'ambassador', label: '大使' },
    { key: 'article', label: '专栏' },
    { key: 'user', label: '用户' },
  ]
  return (
    <div className="flex gap-6 text-sm border-b pb-3">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} className={`relative pb-1 ${active===t.key ? 'text-primary-600' : 'text-gray-600 hover:text-gray-800'}`}>
          {t.label}
          {typeof counts[t.key] === 'number' && counts[t.key]! > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{counts[t.key]! > 99 ? '99+' : counts[t.key]}</span>
          )}
          {active===t.key && <span className="absolute -bottom-[11px] left-0 right-0 h-[2px] bg-primary-600"/>}
        </button>
      ))}
    </div>
  )
}

export default function SearchClient() {
  const sp = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState(sp?.get('q') || '')
  const [tab, setTab] = useState<Tab>((sp?.get('type') as Tab) || 'all')
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [ambassadors, setAmbassadors] = useState<any[]>([])
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({})
  const [sort, setSort] = useState<'latest'|'hot'>('latest')

  const submit = () => {
    const qq = q.trim()
    const isUser = /^@/.test(qq)
    const nextTab: Tab = isUser ? 'user' : tab
    router.push(`/search?q=${encodeURIComponent(qq)}&type=${nextTab}`)
    setTab(nextTab)
    fetchAll(qq)
  }

  const fetchAll = async (qq: string) => {
    if (!qq) return
    setLoading(true)
    try {
      const [contentRes, userRes, ambRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(qq)}&limit=20`, { cache: 'no-store' }),
        fetch(`/api/search/users?q=${encodeURIComponent(qq)}`, { cache: 'no-store' }),
        fetch(`/api/search/ambassadors?q=${encodeURIComponent(qq)}`, { cache: 'no-store' }),
      ])
      const [contentJson, userJson, ambJson] = await Promise.all([contentRes.json(), userRes.json(), ambRes.json()])
      setContent(contentJson?.data || [])
      setUsers(userJson?.data || [])
      setAmbassadors(ambJson?.data || [])
      setCounts({
        all: (contentJson?.pagination?.total || 0) + (userJson?.total || 0) + (ambJson?.total || 0),
        article: (contentJson?.data || []).filter((i:any)=>i.category==='article').length,
        video: (contentJson?.data || []).filter((i:any)=>i.category==='video').length,
        user: userJson?.total || (userJson?.data?.length || 0),
        ambassador: ambJson?.total || (ambJson?.data?.length || 0),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  const qq = sp?.get('q') || ''
  setQ(qq)
  const typeFromUrl = (sp?.get('type') as Tab) || (qq.startsWith('@') ? 'user' : 'all')
  setTab(typeFromUrl)
    if (qq) fetchAll(qq)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  const filteredContent = useMemo(() => {
    let list = content
    if (tab === 'article' || tab === 'video') list = content.filter((i:any)=>i.category===tab)
    if (tab !== 'all' && tab !== 'article' && tab !== 'video') return []
    if (sort === 'hot') {
      list = [...list].sort((a:any,b:any)=> (b.views||0)+(b.likes||0) - ((a.views||0)+(a.likes||0)))
    }
    return list
  }, [tab, content, sort])

  return (
    <div>
      <div className="relative mb-6">
        <input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') submit() }} placeholder="搜索文章 / 视频 / 大使 / 用户" className="w-full rounded-2xl border px-5 py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        <button onClick={submit} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary-600 px-5 py-2 text-white hover:bg-primary-700">搜索</button>
      </div>
      <TabNav active={tab} counts={counts} onChange={(t)=>{ setTab(t); router.push(`/search?q=${encodeURIComponent(q)}&type=${t}`) }} />

      <div className="mt-6 space-y-4">
        {(tab==='all' || tab==='article' || tab==='video') && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-gray-500">排序</span>
            <select value={sort} onChange={e=>setSort(e.target.value as any)} className="border rounded-md px-2 py-1">
              <option value="latest">最新</option>
              <option value="hot">热度</option>
            </select>
          </div>
        )}
        {tab==='user' && (
          <div className="grid gap-3">
            {users.map((u:any)=> (
              <Link key={u.uid} href={`/u/${u.uid}`} className="flex items-center justify-between rounded-xl border p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-sm font-semibold">{(u.username||'用').slice(0,1)}</div>
                  <div className="text-sm">
                    <div className="font-medium">{u.username || '用户'}</div>
                    <div className="text-gray-500">XP {u.xp_total ?? 0}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">查看</span>
              </Link>
            ))}
            {users.length===0 && !loading && <div className="text-sm text-gray-500">未找到相关用户</div>}
          </div>
        )}

        {tab==='ambassador' && (
          <div className="grid gap-3">
            {ambassadors.map((a:any)=> (
              <div key={a.id} className="rounded-xl border p-4">
                <div className="font-medium">{a.name}</div>
                <div className="text-sm text-gray-500">{a.country}{a.city?` · ${a.city}`:''}</div>
              </div>
            ))}
            {ambassadors.length===0 && !loading && <div className="text-sm text-gray-500">未找到相关大使</div>}
          </div>
        )}

        {(tab==='all' || tab==='article' || tab==='video') && (
          <div className="grid gap-3">
            {filteredContent.map((c:any)=> (
              <Link key={c.id} href={c.category==='article' ? `/articles/${c.id}` : c.external_url ? c.external_url : '#'} className="rounded-xl border p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-gray-500">{c.category === 'video' ? '视频' : c.category === 'article' ? '文章' : c.category}</div>
                  </div>
                  <span className="text-xs text-gray-400">查看</span>
                </div>
              </Link>
            ))}
            {filteredContent.length===0 && !loading && <div className="text-sm text-gray-500">未找到相关内容</div>}
          </div>
        )}

        {loading && <div className="text-sm text-gray-500">搜索中...</div>}
      </div>
    </div>
  )
}
