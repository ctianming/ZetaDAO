'use client'

export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import { useSession, signIn } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Award, Shield, Link as LinkIcon, Wallet, User as UserIcon, KeyRound, TrendingUp, Loader2, Lock } from 'lucide-react'
import { computeLevel } from '@/lib/xp'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import ArticleCard from '@/components/content/ArticleCard'
import { PublishedContent } from '@/types'
import AvatarEditor from '@/components/profile/AvatarEditor'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'

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
  const { data: session, status } = useSession()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [identities, setIdentities] = useState<any[]>([])
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdOpen, setPwdOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const walletAddress = (session as any)?.walletAddress as string | undefined
  const uid = (session as any)?.uid as string | undefined
  const { address, isConnected, connector: activeConnector } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const activeConnectorId = activeConnector?.id
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
  const hasPromptedForLogin = useRef(false)
  const [xpLoading, setXpLoading] = useState(false)
  const [xpCursor, setXpCursor] = useState<string | null>(null)
  const [xpHasMore, setXpHasMore] = useState(false)
  const { openConnectModal } = useConnectModal()
  const { show } = useToast()
  const [unbindProvider, setUnbindProvider] = useState<string | null>(null)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  // 签名提醒 watchdog：10s 未检测到签名完成则给出更明确的引导
  const signWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearSignWatchdog = useCallback(() => {
    if (signWatchdogRef.current) {
      clearTimeout(signWatchdogRef.current)
      signWatchdogRef.current = null
    }
  }, [])
  const startSignWatchdog = useCallback(() => {
    clearSignWatchdog()
    signWatchdogRef.current = setTimeout(() => {
      // 仍处于绑定中且尚未完成签名->提交
      if (activeConnectorId === 'walletConnect') {
        setBindMsg('未检测到签名弹窗，请打开钱包App，进入“待处理/通知”查看并确认签名；若无，请断开并重新通过 WalletConnect 连接后再试。')
      } else {
        setBindMsg('未检测到签名弹窗，请检查浏览器钱包弹窗是否被拦截（广告拦截/无痕模式），或在钱包扩展中手动确认请求。')
      }
    }, 10000)
  }, [activeConnectorId, clearSignWatchdog])
  const requestLogin = useCallback(() => {
    if (typeof window === 'undefined') {
      void signIn()
      return
    }
    window.dispatchEvent(new Event('zd-open-login'))
  }, [])

  // 简易等级：Lv1:0-99, Lv2:100-299, Lv3:300-599, Lv4:600-999, Lv5:1000+
  const { level, nextLevelAt, progressPct } = useMemo(() => computeLevel(xpTotal || 0), [xpTotal])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (!hasPromptedForLogin.current) {
        setLoginPromptOpen(true)
        hasPromptedForLogin.current = true
      }
    } else if (status === 'authenticated') {
      hasPromptedForLogin.current = false
      setLoginPromptOpen(false)
    }
  }, [status])

  const walletIdentity = useMemo(() => identities.find(i => i.provider === 'wallet') || null, [identities])

  const isWalletBound = useMemo(() => Boolean(walletIdentity), [walletIdentity])

  const boundWalletDisplay = useMemo(() => {
    if (walletIdentity?.account_id) return walletIdentity.account_id
    if (walletAddress) return walletAddress
    if (!mounted) return ''
    return address || ''
  }, [walletIdentity, walletAddress, address, mounted])

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

  const loadMoreXp = useCallback(async (reset = false) => {
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
  }, [xpCursor])

  useEffect(() => {
    if (status !== 'authenticated') return
    void loadMoreXp(true)
  }, [status, loadMoreXp])

  useEffect(() => {
    if (status === 'authenticated') return
    setXpEvents([])
    setXpCursor(null)
    setXpHasMore(false)
  }, [status])

  const unbind = async (provider: string) => {
    setUnbindProvider(provider)
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
          </div>
        </main>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center bg-white rounded-2xl border shadow-sm p-8">
            <h1 className="text-2xl font-semibold mb-4">个人资料</h1>
            <p className="text-sm text-gray-600 mb-6">请先登录后再访问个人资料页。</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-md border hover:bg-gray-50"
              >返回首页</button>
              <button
                onClick={requestLogin}
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
              >去登录</button>
            </div>
          </div>
        </main>
        <ConfirmDialog
          open={loginPromptOpen}
          title="需要登录"
          description="访问个人资料前请先登录。现在去登录吗？"
          confirmText="去登录"
          cancelText="返回首页"
          onCancel={() => { setLoginPromptOpen(false); router.push('/') }}
          onConfirm={() => { setLoginPromptOpen(false); requestLogin() }}
        />
      </div>
    )
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
                        disabled={binding || (isWalletBound && walletIdentity?.account_id?.toLowerCase() === address?.toLowerCase()) || !address}
                        onClick={async ()=>{
                          setBindMsg('')
                          if (!isConnected) { openConnectModal?.(); setBindMsg('请先连接钱包'); return }
                          if (!address) { setBindMsg('未检测到钱包地址'); return }
                          const currentAddress = address
                          setBinding(true)
                          try {
                            console.debug('[bind] start, address:', address)
                            const nonceRes = await fetch('/api/auth/wallet/nonce', { cache: 'no-store' })
                            const { nonce } = await nonceRes.json()
                            const message = `Sign-in to ZetaDAO\n\nNonce: ${nonce}`
                            let signature: string | null = null
                            // 注入类钱包：预先触发账户授权请求，确保扩展弹窗被激活
                            if (activeConnectorId !== 'walletConnect') {
                              try {
                                let eth = (typeof window !== 'undefined' ? (window as any).ethereum : null)
                                if (eth?.providers?.length) {
                                  const mm = eth.providers.find((p: any) => p?.isMetaMask || p?.providerInfo?.rdns === 'io.metamask')
                                  if (mm) eth = mm
                                }
                                if (eth?.request) {
                                  await eth.request({ method: 'eth_requestAccounts' })
                                  await new Promise(r => setTimeout(r, 150))
                                }
                              } catch (preErr: any) {
                                const m = String(preErr?.message || '')
                                if (/denied|rejected|cancel/i.test(m)) { setBindMsg('已取消授权'); return }
                                // 静默失败则继续由签名阶段处理
                              }
                            }
                            setBindMsg('已发起签名请求，请在钱包中确认…')
                            startSignWatchdog()
                            try {
                              // 增加 60s 超时保护，避免无限等待
                              signature = await Promise.race([
                                signMessageAsync({ message }),
                                new Promise<string>((_, reject) => setTimeout(() => reject(new Error('SIGN_TIMEOUT')), 60000))
                              ]) as string
                            } catch (err: any) {
                              const msg = String(err?.message || '')
                              if (msg === 'SIGN_TIMEOUT') {
                                if (activeConnectorId === 'walletConnect') setBindMsg('签名超时：请打开钱包App手动确认请求，或断开重连后再试')
                                else setBindMsg('签名超时：请检查浏览器钱包弹窗是否被拦截，或在钱包扩展中手动确认后重试')
                                return
                              }
                              // 钱包未授权当前站点（常见于 Coinbase/部分钱包会抛出 4100 或包含 authorized 字样的错误）
                              if ((err?.code === 4100) || /authorized/i.test(msg) || /not been authorized/i.test(msg)) {
                                // 触发授权请求（eth_requestAccounts），授权成功后重试签名一次
                                try {
                                  if (activeConnectorId === 'walletConnect') {
                                    // WalletConnect：不要调用 window.ethereum，提示用户在手机钱包内授权/确认
                                    setBindMsg('请在已连接的钱包App内授权账户访问，并确认签名请求；若未弹出，请打开App查看待处理请求。')
                                    await new Promise(r => setTimeout(r, 400))
                                    startSignWatchdog()
                                    try { signature = await signMessageAsync({ message }) } catch (e2: any) {
                                      const m2 = String(e2?.message || '')
                                      if (/denied|rejected|cancel/i.test(m2)) setBindMsg('已取消签名')
                                      else setBindMsg('签名失败，请在钱包App授权/确认后重试')
                                      return
                                    }
                                  } else {
                                    let eth = (typeof window !== 'undefined' ? (window as any).ethereum : null)
                                    // 在多注入场景（MetaMask + Coinbase）下优先选择 MetaMask 提供者
                                    if (eth?.providers?.length) {
                                      const mm = eth.providers.find((p: any) => p?.isMetaMask || p?.providerInfo?.rdns === 'io.metamask')
                                      if (mm) eth = mm
                                    }
                                    if (eth?.request) {
                                      await eth.request({ method: 'eth_requestAccounts' })
                                      // 小延迟以等待钱包状态同步
                                      await new Promise(r => setTimeout(r, 200))
                                      try {
                                        setBindMsg('已发起签名请求，请在钱包中确认…')
                                        startSignWatchdog()
                                        signature = await Promise.race([
                                          signMessageAsync({ message }),
                                          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('SIGN_TIMEOUT')), 60000))
                                        ]) as string
                                      } catch (e2: any) {
                                        const m2 = String(e2?.message || '')
                                        if (m2 === 'SIGN_TIMEOUT') { setBindMsg('签名超时：请检查浏览器钱包弹窗或在扩展中手动确认后重试'); return }
                                        if (/denied|rejected|cancel/i.test(m2)) {
                                          setBindMsg('已取消签名')
                                        } else {
                                          setBindMsg('签名失败，请在钱包授权账户访问后重试')
                                        }
                                        return
                                      }
                                    } else {
                                      // 回退到连接弹窗
                                      openConnectModal?.()
                                      setBindMsg('请先在钱包中授权本网站访问账户，授权后再点击绑定。')
                                      return
                                    }
                                  }
                                } catch (eReq: any) {
                                  // 用户拒绝或钱包不支持 request 权限
                                  const m3 = String(eReq?.message || '')
                                  if (/denied|rejected|cancel/i.test(m3)) setBindMsg('已取消授权')
                                  else setBindMsg('需要钱包授权账户访问，请在钱包中同意后重试')
                                  return
                                }
                              } else if (/denied|rejected|cancel/i.test(msg)) {
                                setBindMsg('已取消签名')
                                return
                              } else {
                                // -32002 通常表示已有请求在处理中（例如钱包弹窗未处理）
                                if (String(err?.code) === '-32002' || /already pending|processing/i.test(msg)) {
                                  setBindMsg('钱包已弹出请求，请在钱包中完成当前操作…')
                                  return
                                }
                                if (activeConnectorId === 'walletConnect') {
                                  setBindMsg('签名失败，请在钱包App中查看并完成请求，或断开后重新通过 WalletConnect 连接再试')
                                  return
                                } else {
                                  // 兜底：直接调用以太坊原生 API 尝试 personal_sign / eth_sign（注入类钱包）
                                  try {
                                    let eth = (typeof window !== 'undefined' ? (window as any).ethereum : null)
                                    if (eth?.providers?.length) {
                                      const mm = eth.providers.find((p: any) => p?.isMetaMask || p?.providerInfo?.rdns === 'io.metamask')
                                      if (mm) eth = mm
                                    }
                                    if (eth?.request && currentAddress) {
                                      try {
                                        // 优先 personal_sign
                                        signature = await eth.request({ method: 'personal_sign', params: [message, currentAddress] })
                                      } catch (ePs: any) {
                                        // 再尝试 eth_sign（部分钱包可能禁用）
                                        if (eth?.request) {
                                          signature = await eth.request({ method: 'eth_sign', params: [currentAddress, message] })
                                        }
                                      }
                                    }
                                  } catch {}
                                  if (!signature) {
                                    setBindMsg('签名失败，请重试')
                                    return
                                  }
                                }
                              }
                            }
                            clearSignWatchdog()
                            if (!signature) { setBindMsg('签名失败，请重试'); return }
                            if (!currentAddress) { setBindMsg('未检测到钱包地址'); return }
                            const normalized = currentAddress.toLowerCase()
                            setBindMsg('已完成签名，正在提交绑定…')
                            const ctrl = new AbortController()
                            const t = setTimeout(() => ctrl.abort(), 15000)
                            let res: Response | null = null
                            try {
                              res = await fetch('/api/auth/identity', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ provider: 'wallet', account_id: normalized, message, signature }),
                                signal: ctrl.signal,
                              })
                            } catch (e: any) {
                              if (e?.name === 'AbortError') {
                                setBindMsg('网络超时，稍后重试或检查服务是否可用')
                                return
                              }
                              setBindMsg('网络异常，稍后再试')
                              return
                            } finally {
                              clearTimeout(t)
                            }
                            const j = await res.json().catch(() => ({}))
                            if (!res.ok || !j.success) {
                              if (res.status === 401) setBindMsg(j.error || '需要先登录后再绑定')
                              else if (res.status === 409) setBindMsg(j.error || '该钱包已被其他账号绑定')
                              else setBindMsg(j.error || '绑定失败')
                            }
                            else {
                              setBindMsg('绑定成功');
                              setIdentities(prev => {
                                const idx = prev.findIndex(p => p.provider === 'wallet')
                                if (idx >= 0) {
                                  const next = [...prev]
                                  next[idx] = { ...next[idx], account_id: normalized }
                                  return next
                                }
                                return [...prev, { provider: 'wallet', account_id: normalized }]
                              })
                              try { await fetch('/api/auth/session?update=1', { cache: 'no-store' }) } catch {}
                            }
                          } catch {
                            setBindMsg('绑定失败，请重试')
                          } finally {
                            clearSignWatchdog()
                            setBinding(false)
                          }
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >{binding ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> 绑定中…</>) : (isWalletBound && walletIdentity?.account_id?.toLowerCase() === address?.toLowerCase() ? '已绑定' : '绑定当前钱包')}</button>
                    )}
                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      {bindMsg && <span>{bindMsg}</span>}
                      {!walletIdentity && (
                        <span className="text-amber-600">未检测到已绑定的钱包身份。请连接钱包并点击上方按钮进行绑定。</span>
                      )}
                    </div>
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
                    onClick={() => void loadMoreXp(false)}
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
      {/* 确认解绑 */}
      <ConfirmDialog
        open={!!unbindProvider}
        title="确认解绑"
        description={`确定解绑 ${unbindProvider} ?`}
        onCancel={()=> setUnbindProvider(null)}
        onConfirm={async ()=>{
          const provider = unbindProvider
          setUnbindProvider(null)
          if (!provider) return
          const res = await fetch(`/api/auth/identity?provider=${provider}`, { method: 'DELETE' })
          const j = await res.json()
          if (!j.success) show(j.error || '解绑失败', { type: 'error' })
          else {
            setIdentities(ids => ids.filter(i => i.provider !== provider))
            show('解绑成功', { type: 'success' })
          }
        }}
      />
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
