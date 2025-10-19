'use client'

import Header from '@/components/layout/Header'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { Award, Shield, Link as LinkIcon, Wallet, User as UserIcon, KeyRound, TrendingUp, Loader2, Lock } from 'lucide-react'
import { computeLevel } from '@/lib/xp'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import ArticleCard from '@/components/content/ArticleCard'
import { PublishedContent } from '@/types'
import AvatarEditor from '@/components/profile/AvatarEditor'
import { useRef } from 'react'
import { useToast } from '@/components/ui/Toast'

function mapType(t?: string) {
  switch (t) {
    case 'checkin': return '签到'
    case 'publish': return '发布'
    case 'view_threshold': return '浏览达成'
    case 'tip_give': return '打赏（赠）'
    case 'tip_receive': return '打赏（收）'
    default: return '其他'
  }
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [identities, setIdentities] = useState<any[]>([])
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdOpen, setPwdOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const walletAddress = (session as any)?.walletAddress as string | undefined
  const uid = (session as any)?.uid as string | undefined
  const { address, isConnected } = useAccount()
  const [bindMsg, setBindMsg] = useState('')
  const [binding, setBinding] = useState(false)
  const xpTotal = (session as any)?.xpTotal as number | undefined
  const [xpEvents, setXpEvents] = useState<any[]>([])
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editErrName, setEditErrName] = useState<string>('')
  const [editErrBio, setEditErrBio] = useState<string>('')
  const editPanelRef = useRef<HTMLDivElement | null>(null)
  const [xpLoading, setXpLoading] = useState(false)
  const [xpCursor, setXpCursor] = useState<string | null>(null)
  const [xpHasMore, setXpHasMore] = useState(false)
  const { openConnectModal } = useConnectModal()
  const { show } = useToast()

  // 简易等级：Lv1:0-99, Lv2:100-299, Lv3:300-599, Lv4:600-999, Lv5:1000+
  const { level, nextLevelAt, progressPct } = useMemo(() => computeLevel(xpTotal || 0), [xpTotal])

  const isWalletBound = useMemo(() => {
    if (walletAddress) return true
    return identities.some(i => i.provider === 'wallet')
  }, [walletAddress, identities])

  const boundWalletDisplay = useMemo(() => {
    return walletAddress || identities.find(i => i.provider === 'wallet')?.account_id || address || ''
  }, [walletAddress, identities, address])

  useEffect(() => {
    const load = async () => {
      if (!uid) return
      const res = await fetch(`/api/user?uid=${uid}`, { cache: 'no-store' })
      const j = await res.json()
      if (j?.data?.user?.username) setUsername(j.data.user.username)
      if (j?.data?.user?.avatar_url) setAvatarUrl(j.data.user.avatar_url)
      if (j?.data?.user?.bio) setBio(j.data.user.bio)
      if (j?.data?.identities) setIdentities(j.data.identities)
    }
    load()
  }, [uid])
  const [articles, setArticles] = useState<PublishedContent[]>([])
  const [articleLoading, setArticleLoading] = useState(false)
  useEffect(() => {
    const loadArticles = async () => {
      if (!uid) return
      setArticleLoading(true)
      try {
        const res = await fetch(`/api/content?category=article&authorUid=${uid}&limit=6`, { cache: 'no-store' })
        const j = await res.json()
        if (j?.success && Array.isArray(j.data)) setArticles(j.data)
      } finally {
        setArticleLoading(false)
      }
    }
    loadArticles()
  }, [uid])

  useEffect(() => {
    void loadMoreXp(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMoreXp = async (reset = false) => {
    setXpLoading(true)
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (!reset && xpCursor) params.set('before', xpCursor)
      const res = await fetch(`/api/xp/events?${params.toString()}`, { cache: 'no-store' })
      const j = await res.json()
      if (j?.success && Array.isArray(j.items)) {
        setXpEvents(prev => reset ? j.items : [...prev, ...j.items])
        setXpCursor(j.nextCursor || null)
        setXpHasMore(!!j.hasMore)
      }
    } finally {
      setXpLoading(false)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar_url: avatarUrl, bio })
      })
      const j = await res.json()
  if (!j?.success) show(j?.error || '保存失败', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const unbind = async (provider: string) => {
    if (!confirm(`确定解绑 ${provider} ?`)) return
    const res = await fetch(`/api/auth/identity?provider=${provider}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) show(j.error || '解绑失败', { type: 'error' })
    else {
      setIdentities(ids => ids.filter(i => i.provider !== provider))
      show('解绑成功', { type: 'success' })
    }
  }

  const changePassword = async () => {
    setPwdMsg('')
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew })
    })
    const j = await res.json()
  if (!j.success) setPwdMsg(j.error || '修改失败')
  else setPwdMsg('密码修改成功')
  }

  async function compressImage(file: File, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<File> {
    try {
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      await new Promise((res, rej) => {
        img.onload = () => res(null)
        img.onerror = rej
        img.src = url
      })
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const type = file.type === 'image/png' ? 'image/webp' : file.type
      const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b!), type, quality))
      URL.revokeObjectURL(url)
      return new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.webp'), { type })
    } catch {
      return file
    }
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      // client-side compress to reduce bandwidth
      file = await compressImage(file, 512, 512, 0.85)
      const form = new FormData()
      form.append('file', file)
      form.append('filename', file.name)
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const j = await res.json()
      if (!j.success) { show(j.error || '上传失败', { type: 'error' }); return }
      setAvatarUrl(j.url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      {/* Hero 区 */}
      <section className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-5">
            <AvatarEditor
              isSelf={true}
              avatarUrl={avatarUrl}
              username={username || (session as any)?.user?.name}
              size={80}
              onUpdated={(url)=>setAvatarUrl(url)}
              className="rounded-2xl bg-white/10 border-white/20 ring-2 ring-white/30"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className="text-2xl font-semibold truncate cursor-pointer hover:opacity-90"
                  title="点击编辑资料"
                  onClick={()=>{ setEditName(username || (session as any)?.user?.name || ''); setEditBio(bio || ''); setEditProfileOpen(true) }}
                >{username || (session as any)?.user?.name || '用户'}</div>
                <button
                  className="text-xs px-2 py-1 rounded-md border border-white/30 hover:bg-white/10"
                  onClick={()=>{ setEditName(username || (session as any)?.user?.name || ''); setEditBio(bio || ''); setEditProfileOpen(true) }}
                >编辑</button>
              </div>
              <div
                className="mt-1 text-white/90 line-clamp-2 break-words max-w-prose cursor-pointer hover:opacity-90"
                title="点击编辑资料"
                onClick={()=>{ setEditName(username || (session as any)?.user?.name || ''); setEditBio(bio || ''); setEditProfileOpen(true) }}
              >
                {bio || '这位用户很神秘，什么也没写。'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
                <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1"><Award className="w-4 h-4" /> XP {xpTotal ?? 0}</span>
                <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1"><Shield className="w-4 h-4" /> Lv {level}</span>
                {walletAddress && <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1"><Wallet className="w-4 h-4" /> {walletAddress.slice(0,6)}…{walletAddress.slice(-4)}</span>}
              </div>
            </div>
          </div>
          {/* 等级进度条 */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-2 opacity-90">
              <span>等级进度</span>
              <span>{progressPct}% {nextLevelAt!==Infinity && `(下一级 ${nextLevelAt} XP)`}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/90 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左列：资料与安全 */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <UserIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">基本资料</h2>
              </div>
              {/* 头像行已上移到 Hero，不再重复展示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm mb-1">UID</label>

              {editProfileOpen && (
                <div className="fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-black/40 transition-opacity duration-150" onClick={()=>setEditProfileOpen(false)} />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div
                      ref={editPanelRef}
                      role="dialog" aria-modal="true" aria-label="编辑资料"
                      className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-5 transition-all duration-150"
                    >
                      <div className="text-base font-semibold mb-4">编辑资料</div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-1">用户名</label>
                          <input
                            className="border rounded-lg px-3 py-2 w-full"
                            value={editName}
                            onChange={e=>{
                              const v = e.target.value.trim()
                              setEditName(v)
                              const ok = new RegExp('^[\\p{L}\\p{N}_-]{3,20}$','u').test(v)
                              setEditErrName(ok ? '' : '3-20 字，支持中文、字母、数字、下划线与短横线')
                            }}
                            maxLength={20}
                            autoFocus
                          />
                          <div className={"text-xs mt-1 "+(editErrName?"text-red-600":"text-gray-500")}>{editErrName || '3-20 字，支持中文、字母、数字、下划线与短横线'}</div>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">个性签名</label>
                          <textarea
                            className="border rounded-lg px-3 py-2 w-full"
                            rows={3}
                            value={editBio}
                            onChange={e=>{
                              const v = e.target.value
                              setEditBio(v)
                              setEditErrBio(v.length <= 160 ? '' : '最多 160 字')
                            }}
                            maxLength={200}
                          />
                          <div className={"text-xs mt-1 "+(editErrBio?"text-red-600":"text-gray-500")}>{editErrBio || `最多 160 字（已输入 ${editBio.length}）`}</div>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end gap-2">
                        <button className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50" onClick={()=>setEditProfileOpen(false)}>取消</button>
                        <button
                          className="px-3 py-2 text-sm rounded-md text-white bg-primary-600 hover:bg-primary-700"
                          disabled={!!editErrName || !!editErrBio || !editName}
                          onClick={async ()=>{
                            if (editErrName || editErrBio || !editName) return
                            const body:any = { username: editName, bio: editBio }
                            const res = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                            const j = await res.json()
                            if (!j?.success) { show(j?.error || '保存失败', { type: 'error' }); return }
                            setUsername(editName)
                            setBio(editBio)
                            setEditProfileOpen(false)
                            show('保存成功', { type: 'success' })
                          }}
                        >保存</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 break-all text-xs">{uid || '未登录'}</div>
                </div>
                <div>
                  <label className="block text-sm mb-1">钱包地址</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 break-all text-xs">{boundWalletDisplay || '未绑定'}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {!isConnected && !isWalletBound ? (
                      <button
                        onClick={() => openConnectModal && openConnectModal()}
                        className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                      >连接钱包</button>
                    ) : (
                      <button
                        disabled={binding || isWalletBound || !address}
                        onClick={async ()=>{
                          setBindMsg('')
                          if (!address) { setBindMsg('未检测到钱包地址'); return }
                          setBinding(true)
                          try {
                            const res = await fetch('/api/auth/identity', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ provider: 'wallet', account_id: address })
                            })
                            const j = await res.json()
                            if (!j.success) setBindMsg(j.error || '绑定失败')
                            else {
                              setBindMsg('绑定成功');
                              setIdentities(prev => {
                                if (prev.some(p => p.provider === 'wallet')) return prev
                                return [...prev, { provider: 'wallet', account_id: address }]
                              })
                            }
                          } finally {
                            setBinding(false)
                          }
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      >{isWalletBound ? '已绑定' : '绑定当前钱包'}</button>
                    )}
                    {bindMsg && <span className="text-xs text-gray-600">{bindMsg}</span>}
                  </div>
                </div>
              </div>
              {/* 用户名与简介编辑改为顶部 Hero 的“编辑”弹窗，这里不再提供内联编辑表单 */}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <KeyRound className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">账户安全</h2>
              </div>
              <button onClick={()=> setPwdOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"><Lock className="w-4 h-4" /> 修改密码</button>
            </div>

            {/* 我的文章 */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold">我发布的文章</h2>
                </div>
                <a href="/articles" className="text-sm text-primary-600 hover:underline">更多</a>
              </div>
              {articleLoading ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : (
                <div className="grid gap-4">
                  {articles.length === 0 && <div className="text-sm text-gray-500">暂无发布</div>}
                  {articles.map(a => <ArticleCard key={a.id} article={a} />)}
                </div>
              )}
            </div>
          </div>

          {/* 右列：账户与 XP */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <LinkIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">已绑定身份</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {identities.length === 0 && <div className="text-xs text-gray-500">暂无绑定</div>}
                {identities.map(id => (
                  <div key={id.provider} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm">
                    <span className="capitalize">{id.provider}</span>
                    <span className="text-gray-600 max-w-[160px] truncate">{id.account_id}</span>
                    <button onClick={()=>unbind(id.provider)} className="text-red-600 text-xs hover:underline">解绑</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">（通过对应登录方式完成绑定；GitHub/Google 登录后自动绑定）</div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">最近 XP 记录</h2>
              </div>
              <div className="space-y-3">
                {xpEvents.length === 0 && !xpLoading && <div className="text-xs text-gray-500">暂无记录</div>}
                {xpEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{mapType(e.type)}</span>
                      {e.milestone ? <span className="text-xs text-gray-500">里程碑 {e.milestone}</span> : null}
                    </div>
                    <div className="font-medium text-emerald-600">+{e.amount}</div>
                  </div>
                ))}
                {xpLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中...
                  </div>
                )}
                {xpHasMore && !xpLoading && (
                  <button
                    onClick={() => loadMoreXp(false)}
                    className="text-sm text-primary-600 hover:underline"
                  >加载更多</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* 资料编辑弹窗键盘与焦点管理 */}
      {editProfileOpen && (
        <ProfileEditA11yHelper panelRef={editPanelRef} onClose={()=>setEditProfileOpen(false)} onEnter={async ()=>{
          if (editErrName || editErrBio || !editName) return
          const body:any = { username: editName, bio: editBio }
          const res = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          const j = await res.json()
          if (!j?.success) { show(j?.error || '保存失败', { type: 'error' }); return }
          setUsername(editName); setBio(editBio); setEditProfileOpen(false)
        }} />
      )}
      {/* 修改密码弹窗 */}
      {pwdOpen && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/40" onClick={()=>{ setPwdOpen(false); setPwdMsg(''); setPwdCurrent(''); setPwdNew('') }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border p-6">
            <div className="text-lg font-semibold mb-4">修改密码</div>
            <div className="space-y-3">
              <input className="border rounded-lg px-3 py-2 w-full" type="password" placeholder="当前密码" value={pwdCurrent} onChange={e=>setPwdCurrent(e.target.value)} />
              <input className="border rounded-lg px-3 py-2 w-full" type="password" placeholder="新密码（≥8位）" value={pwdNew} onChange={e=>setPwdNew(e.target.value)} />
              <div className="flex items-center gap-3">
                <button onClick={changePassword} disabled={!pwdCurrent || !pwdNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">提交</button>
                <button onClick={()=>{ setPwdOpen(false); setPwdMsg(''); setPwdCurrent(''); setPwdNew('') }} className="px-4 py-2 border rounded-lg">取消</button>
              </div>
              {pwdMsg && <div className="text-xs text-gray-600">{pwdMsg}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: focus trap and keyboard for profile edit modal
function ProfileEditA11yHelper({ panelRef, onClose, onEnter }:{ panelRef: React.MutableRefObject<HTMLDivElement | null>, onClose: ()=>void, onEnter: ()=>void }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'Enter') { onEnter() }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', handler) }
  }, [panelRef, onClose, onEnter])
  return null
}
