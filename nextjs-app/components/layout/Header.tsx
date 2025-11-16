'use client'

import Link from 'next/link'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useAccount, useChainId, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi'
import { Menu, X, Wind, Star, Clock, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/common/UserAvatar'
import { getZetaChainConfig } from '@/lib/web3'
import { useToast } from '@/components/ui/Toast'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [registerSent, setRegisterSent] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [resendCounter, setResendCounter] = useState(0)
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const xpTotal = (session as any)?.xpTotal as number | undefined
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()
  const { show } = useToast()
  const { CHAIN_ID, CHAIN } = getZetaChainConfig()
  const wcOpenOnce = useRef(false)
  const walletTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearWalletTimeout = useCallback(() => {
    if (walletTimeoutRef.current) {
      clearTimeout(walletTimeoutRef.current)
      walletTimeoutRef.current = null
    }
  }, [walletTimeoutRef])
  // decoupled: no wallet binding to user account anymore (removed unused function)
  const router = useRouter()
  const [miniQ, setMiniQ] = useState('')
  const [oauthError, setOauthError] = useState<string | null>(null)

  // Check for OAuth errors in session
  useEffect(() => {
    if ((session as any)?.error === 'OAuthAccountNotLinked') {
      setOauthError((session as any)?.errorMessage || '此账号尚未注册')
      setLoginOpen(true)
      setAuthTab('signup')
    }
  }, [session])

  useEffect(() => {
    if (!registerSent) return
    setResendCounter(60)
  }, [registerSent])

  useEffect(() => {
    if (resendCounter <= 0) return
    const t = setTimeout(() => setResendCounter((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCounter])

  // 锁定背景滚动，避免弹窗位置随页面滚动导致对齐错位
  useEffect(() => {
    if (loginOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [loginOpen])
  // decoupled: remove auto wallet login-sign flow

  // 仅客户端渲染 Portal，避免 SSR/Hydration 问题
  useEffect(() => { setMounted(true) }, [])

  // no wallet intent anymore

  useEffect(() => () => clearWalletTimeout(), [clearWalletTimeout])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      setLoginError('')
      setRegisterSent(false)
      setRegEmail('')
      setAuthTab('signin')
      setLoginOpen(true)
    }
    window.addEventListener('zd-open-login', handler)
    return () => window.removeEventListener('zd-open-login', handler)
  }, [])

  const navItems = [
    { name: '首页', href: '/' },
    { name: '文章', href: '/articles' },
    { name: '视频', href: '/videos' },
    { name: '活动', href: '/activities' },
    { name: '大使', href: '/ambassadors' },
    { name: '商店', href: '/shop' },
  ]

  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarTimer = useRef<number | null>(null)
  const avatarRef = useRef<HTMLDivElement | null>(null)
  const userName = session?.user?.name || session?.user?.email || '用户'
  const [socialStats, setSocialStats] = useState<{followers:number; following:number; posts?:number; isFollowing:boolean} | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  // wallet connect/disconnect handlers (decoupled from auth)
  const connectWalletAndVerify = useCallback(async () => {
    try {
      setLoginError('')
      setWalletLoading(true)
      if (!isConnected || !address) {
        setTimeout(() => { if (!wcOpenOnce.current) { wcOpenOnce.current = true; openConnectModal?.() } }, 50)
        setWalletLoading(false)
        return
      }
      // Enforce ZetaChain network before signing
      try {
        const desired = CHAIN_ID
        if (chainId !== desired) {
          await switchChainAsync({ chainId: desired })
        }
      } catch (e: any) {
        const code = e?.code
        if (code === 4001) {
          setLoginError('已取消切换网络，请先在钱包中切换至指定的 ZetaChain 网络后再重试')
          setWalletLoading(false)
          return
        }
        // 4902: 未添加链；其他错误：提示手动切换
        setLoginError('请在钱包中切换至 ZetaChain 指定网络（测试网或主网），然后重试连接')
        setWalletLoading(false)
        return
      }
      const nonceRes = await fetch('/api/auth/wallet/nonce', { cache: 'no-store' })
      const { nonce } = await nonceRes.json()
      const message = `Connect wallet to ZetaDAO\n\nNonce: ${nonce}`
      const signature = await signMessageAsync({ message })
      const res = await fetch('/api/auth/wallet/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, message, signature }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        setLoginError(j?.error || '钱包连接验证失败')
      }
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (/authorized/i.test(msg) || (e?.code === 4100)) {
        setTimeout(() => { if (!wcOpenOnce.current) { wcOpenOnce.current = true; openConnectModal?.() } }, 100)
      } else {
        setLoginError('钱包连接失败，请重试')
      }
    } finally {
      setWalletLoading(false)
    }
  }, [isConnected, address, openConnectModal, signMessageAsync, chainId, switchChainAsync, CHAIN_ID])

  const disconnectWallet = useCallback(async () => {
    try {
      await fetch('/api/auth/wallet/disconnect', { method: 'POST' })
    } catch {}
    try { await disconnectAsync() } catch {}
  }, [disconnectAsync])

  useEffect(() => {
    const load = async () => {
      const uid = (session as any)?.uid
      if (!uid) return
      try {
        const res = await fetch(`/api/social/stats?uid=${uid}`, { cache: 'no-store' })
        const j = await res.json()
        if (j?.success) setSocialStats(j.data)
      } catch {}
      try {
        const ur = await fetch(`/api/user?uid=${uid}`, { cache: 'no-store' })
        const uj = await ur.json()
        const url = uj?.data?.user?.avatar_url as string | undefined
        if (url) setAvatarUrl(url)
      } catch {}
    }
    load()
  }, [session])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!avatarRef.current) return
      if (!avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('click', onDocClick)
    const onAvatarUpdated = (e: any) => {
      const url = e?.detail?.url as string | undefined
      if (url) setAvatarUrl(url)
    }
    window.addEventListener('avatar-updated', onAvatarUpdated as any)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const ready = mounted
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
            Z
          </div>
          <div className="flex flex-col">
            <span className="hidden font-bold sm:inline-block gradient-text text-xl">
              ZetaDAO
            </span>
            <span className="hidden sm:inline-block text-[9px] text-gray-400 font-mono -mt-1" title={`构建版本: ${buildId}`}>
              v{buildId.slice(-8)}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
  <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary-500"
            >
              {item.name}
            </Link>
          ))}
          <div className="ml-4 relative">
            <input
              value={miniQ}
              onChange={(e)=>setMiniQ(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter' && miniQ.trim()) {
                const t = miniQ.trim()
                const isUser = /^@/.test(t)
                const q = encodeURIComponent(t)
                router.push(`/search?q=${q}&type=${isUser?'user':'all'}`)
              } }}
              placeholder="搜索"
              className="w-40 xl:w-60 rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 relative">
          {/* Network status badge */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            {ready ? (
              <>
                <span className={`px-2 py-1 rounded-full text-xs border ${chainId === CHAIN_ID ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                  title={chainId === CHAIN_ID ? `已连接到 ${CHAIN.name}` : `当前网络不匹配，需 ${CHAIN.name}`}>
                  {chainId === CHAIN_ID ? CHAIN.name : `需 ${CHAIN.name}`}
                </span>
                {isConnected && chainId !== CHAIN_ID && (
                  <button
                    className="text-xs underline"
                    onClick={async () => {
                      try {
                        await switchChainAsync({ chainId: CHAIN_ID })
                      } catch (e: any) {
                        if (e?.code === 4001) {
                          show('已取消切换网络', { type: 'error' })
                        } else {
                          show('请在钱包中手动切换到指定网络后重试', { type: 'error' })
                        }
                      }
                    }}
                  >切换</button>
                )}
              </>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs border text-gray-400 bg-gray-50">网络</span>
            )}
          </div>
          {/* Quick actions (desktop) */}
          <div className="hidden md:flex items-center gap-5 mr-2">
            <Link href="/dynamics" className="group flex flex-col items-center justify-center text-[11px] text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded-xl" aria-label="动态">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full border bg-white group-hover:border-primary-400">
                <Wind size={18} className="text-gray-700 group-hover:text-primary-600" />
              </span>
              <span className="mt-1">动态</span>
            </Link>
            <Link href="/profile" className="group flex flex-col items-center justify-center text-[11px] text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded-xl" aria-label="收藏">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full border bg-white group-hover:border-primary-400">
                <Star size={18} className="text-gray-700 group-hover:text-primary-600" />
              </span>
              <span className="mt-1">收藏</span>
            </Link>
            <Link href="/profile" className="group flex flex-col items-center justify-center text-[11px] text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded-xl" aria-label="历史">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full border bg-white group-hover:border-primary-400">
                <Clock size={18} className="text-gray-700 group-hover:text-primary-600" />
              </span>
              <span className="mt-1">历史</span>
            </Link>
          </div>
          {/* 投稿按钮（突出） */}
          <Link href="/submit" className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-3.5 py-1.5 text-white text-sm font-medium hover:bg-pink-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2">
            <Upload size={16} />
            投稿
          </Link>
          {session?.user ? (
            <div
              ref={avatarRef}
              className="relative"
              onMouseEnter={() => {
                if (avatarTimer.current) window.clearTimeout(avatarTimer.current)
                setAvatarOpen(true)
              }}
              onMouseLeave={() => {
                if (avatarTimer.current) window.clearTimeout(avatarTimer.current)
                avatarTimer.current = window.setTimeout(() => setAvatarOpen(false), 150)
              }}
            >
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className={`group flex items-center justify-center w-9 h-9 rounded-full border bg-white overflow-hidden transition-transform duration-200 ${avatarOpen ? 'scale-105 shadow-md' : 'hover:scale-105 hover:shadow'} `}
                aria-haspopup="true"
                aria-expanded={avatarOpen}
              >
                <UserAvatar url={avatarUrl || (session as any)?.avatarUrl} name={userName} size={36} />
              </button>
              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border shadow-xl p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 mb-4">
                    <UserAvatar url={avatarUrl || (session as any)?.avatarUrl} name={userName} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{userName}</div>
                      {/* decoupled: remove new wallet user hint */}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 text-center mb-4">
                    <div className="py-2">
                      <div className="text-base font-semibold">{socialStats?.following ?? '—'}</div>
                      <div className="text-[11px] text-gray-500">关注</div>
                    </div>
                    <div className="py-2 border-x">
                      <div className="text-base font-semibold">{socialStats?.followers ?? '—'}</div>
                      <div className="text-[11px] text-gray-500">粉丝</div>
                    </div>
                    <div className="py-2">
                      <div className="text-base font-semibold">{socialStats?.posts ?? '—'}</div>
                      <div className="text-[11px] text-gray-500">动态</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {typeof xpTotal === 'number' && (
                      <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-amber-50">
                        <span>我的 XP</span>
                        <span className="font-semibold text-amber-700">{xpTotal}</span>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/xp/checkin', { method: 'POST' })
                          const j = await res.json()
                          if (j?.success) {
                            // 触发 session 更新以刷新 xpTotal
                            await fetch('/api/auth/session?update=1', { cache: 'no-store' })
                            window.location.reload()
                          }
                        } catch {}
                      }}
                      className="w-full text-left flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <span>每日签到 +5 XP</span>
                      <span className="text-xs text-gray-400">→</span>
                    </button>
                    {/* wallet controls inside avatar menu (optional) */}
                    <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg">
                      {isConnected && address ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">钱包</span>
                          <span className="font-mono text-xs">{address.slice(0,6)}…{address.slice(-4)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">未连接钱包</span>
                      )}
                      {isConnected ? (
                        <button onClick={disconnectWallet} className="text-xs underline">断开</button>
                      ) : (
                        <button onClick={connectWalletAndVerify} className="text-xs underline" disabled={walletLoading}>{walletLoading ? '连接中…' : '连接'}</button>
                      )}
                    </div>
                    <Link href="/profile" className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50">
                      <span>个人中心</span>
                      <span className="text-xs text-gray-400">→</span>
                    </Link>
                    <Link href="/submit" className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50">
                      <span>投稿管理</span>
                      <span className="text-xs text-gray-400">→</span>
                    </Link>

                    {(session as any)?.role === 'admin' && (
                      <div className="pt-2 mt-2 border-t">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400">管理员</div>
                        <Link href="/admin/content" className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50">
                          <span>内容管理</span>
                          <span className="text-xs text-gray-400">→</span>
                        </Link>
                        <Link href="/admin/banners" className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50">
                          <span>横幅管理</span>
                          <span className="text-xs text-gray-400">→</span>
                        </Link>
                      </div>
                    )}

                    <button onClick={() => signOut()} className="w-full text-left flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-gray-50">
                      <span>退出登录</span>
                      <span className="text-xs text-gray-400">↩</span>
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-gray-500">主题：浅色</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => { setLoginError(''); setRegisterSent(false); setRegEmail(''); setAuthTab('signin'); setLoginOpen(true) }} className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">登录</button>
          )}

          {/* 独立的钱包连接按钮（与登录解耦） */}
          <div className="ml-2">
            {ready ? (
              isConnected && address ? (
                <button onClick={disconnectWallet} className="text-xs px-3 py-1.5 border rounded-full hover:bg-gray-50 font-mono">
                  {address.slice(0,6)}…{address.slice(-4)} · 断开
                </button>
              ) : (
                <button onClick={connectWalletAndVerify} className="text-xs px-3 py-1.5 border rounded-full hover:bg-gray-50" disabled={walletLoading}>
                  {walletLoading ? '连接中…' : '连接钱包'}
                </button>
              )
            ) : (
              <button className="text-xs px-3 py-1.5 border rounded-full text-transparent select-none">占位文本</button>
            )}
          </div>
          {mounted && loginOpen && createPortal(
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setLoginOpen(false)} />
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border max-h-[85vh] overflow-y-auto">
                <button
                  aria-label="关闭"
                  onClick={() => setLoginOpen(false)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  <X />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* 左侧：登录 / 注册（两步） */}
                  <div className="p-6">
                    <div className="mb-4 text-lg font-medium">{authTab === 'signin' ? '登录' : '注册'}</div>
                    {/* 已移除钱包绑定提示 */}
                    {loginError && <div className="text-red-600 text-xs mb-3">{loginError}</div>}
                    {authTab === 'signin' ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          const fd = new FormData(e.currentTarget as HTMLFormElement)
                          const identifier = String(fd.get('identifier') || '').trim()
                          const password = String(fd.get('password') || '')
                          
                          if (!identifier || !password) {
                            setLoginError('请输入邮箱和密码')
                            return
                          }
                          
                          setFormLoading(true)
                          setLoginError('')
                          
                          try {
                            // Use 'credentials' provider (not 'password')
                            const res = await signIn('credentials', { 
                              identifier, 
                              password, 
                              redirect: false 
                            })
                            
                            if (res?.error) {
                              setLoginError('账号或密码错误，或邮箱未验证')
                              setFormLoading(false)
                              return
                            }
                            
                            if (res?.ok) {
                              // Login successful
                              setLoginOpen(false)
                              setFormLoading(false)
                              window.location.reload() // Refresh to update session
                            } else {
                              setLoginError('登录失败，请重试')
                              setFormLoading(false)
                            }
                          } catch (err) {
                            console.error('[Login Error]', err)
                            setLoginError('登录失败，请检查网络连接')
                            setFormLoading(false)
                          }
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                          <input name="identifier" placeholder="邮箱" autoComplete="email" value={loginIdentifier} onChange={e=>setLoginIdentifier(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">密码</label>
                          <input name="password" type="password" placeholder="密码" autoComplete="current-password" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                        </div>
                        <button className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50" disabled={formLoading}>登录</button>
                        <div className="text-xs text-gray-500">还没有账号？<button type="button" className="underline hover:text-gray-800" onClick={() => setAuthTab('signup')}>去注册</button></div>
                      </form>
                    ) : (
                      !registerSent ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault()
                            const fd = new FormData(e.currentTarget as HTMLFormElement)
                            const email = String(fd.get('reg_email') || '')
                            const password = String(fd.get('reg_password') || '')
                            const username = String(fd.get('reg_username') || '')
                            setLoginError('')
                            setFormLoading(true)
                            if (!username) { setLoginError('请填写用户名'); setFormLoading(false); return }
                            const resp = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, username }) })
                            const json = await resp.json()
                            if (!resp.ok || !json.success) {
                              setLoginError(json.error || '注册失败')
                            } else {
                              setRegisterSent(true)
                              setRegEmail(email)
                            }
                            setFormLoading(false)
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">用户名</label>
                            <input name="reg_username" placeholder="请输入用户名（必填）" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                            <input name="reg_email" placeholder="邮箱" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">密码</label>
                            <input name="reg_password" type="password" placeholder="密码" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          </div>
                          <button className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50" disabled={formLoading}>注册并发送验证码</button>
                          <div className="text-xs text-gray-500">注册即表示同意平台的服务条款与隐私政策。</div>
                          <div className="text-xs text-gray-500">已有账号？<button type="button" className="underline hover:text-gray-800" onClick={() => setAuthTab('signin')}>去登录</button></div>
                        </form>
                      ) : (
                        <form autoComplete="off"
                          onSubmit={async (e) => {
                            e.preventDefault()
                            const fd = new FormData(e.currentTarget as HTMLFormElement)
                            const code = String(fd.get('v_code') || '')
                            setLoginError('')
                            setFormLoading(true)
                            const resp = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail, code }) })
                            const json = await resp.json()
                            if (!resp.ok || !json.success) setLoginError(json.error || '验证失败')
                            else { setAuthTab('signin'); setRegisterSent(false); setLoginIdentifier(regEmail) }
                            setFormLoading(false)
                          }}
                          className="space-y-3"
                        >
                          <div className="text-sm text-gray-700">验证码已发送至：<span className="font-medium">{regEmail}</span></div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">验证码</label>
                            <input name="v_code" placeholder="请输入 6 位验证码" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          </div>
                          <button className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50" disabled={formLoading}>提交验证</button>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>未收到？检查垃圾箱或稍后重试。</span>
                            <button
                              type="button"
                              disabled={resendCounter > 0 || formLoading}
                              className={`underline ${resendCounter>0 ? 'opacity-60 cursor-not-allowed' : 'hover:text-gray-800'}`}
                              onClick={async () => {
                                setFormLoading(true)
                                const resp = await fetch('/api/auth/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail }) })
                                const json = await resp.json()
                                if (!resp.ok || !json.success) setLoginError(json.error || '重发失败')
                                else setResendCounter(60)
                                setFormLoading(false)
                              }}
                            >{resendCounter>0 ? `重发验证码(${resendCounter}s)` : '重发验证码'}</button>
                          </div>
                          <div className="text-xs text-gray-500">验证完成后即可用账号密码登录。<button type="button" className="underline hover:text-gray-800" onClick={() => { setAuthTab('signin'); setRegisterSent(false) }}>返回登录</button></div>
                        </form>
                      )
                    )}
                  </div>

                  {/* 右侧：Google 登录（钱包登录已移除）*/}
                  <div className="p-6 bg-gray-50 border-l">
                    <div className="text-sm text-gray-600 mb-3">第三方快速登录</div>
                    {oauthError && <div className="text-red-600 text-xs mb-3">{oauthError}</div>}
                    <div className="space-y-3">
                      <button
                        onClick={() => signIn('google')}
                        className="w-full text-left px-3 py-2 rounded-lg border hover:bg-white"
                      >
                        使用 Google 登录
                      </button>
                    </div>
                    <div className="mt-6 text-center">
                      <button onClick={() => { wcOpenOnce.current = false; setLoginOpen(false) }} className="text-sm text-gray-600 hover:text-gray-800">取消</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>, document.body)
          }
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary-500"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link href="/submit" className="text-sm font-medium transition-colors hover:text-primary-500" onClick={()=> setMobileMenuOpen(false)}>投稿</Link>
            {/* Mobile: 网络状态与切换 */}
            <div className="pt-2 flex items-center justify-between">
              {ready ? (
                <span className={`px-2 py-1 rounded-full text-xs border ${chainId === CHAIN_ID ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                  title={chainId === CHAIN_ID ? `已连接到 ${CHAIN.name}` : `当前网络不匹配，需 ${CHAIN.name}`}>
                  {chainId === CHAIN_ID ? CHAIN.name : `需 ${CHAIN.name}`}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs border text-gray-400 bg-gray-50">网络</span>
              )}
              {ready && isConnected && chainId !== CHAIN_ID && (
                <button
                  className="text-xs underline"
                  onClick={async () => {
                    try {
                      await switchChainAsync({ chainId: CHAIN_ID })
                    } catch (e: any) {
                      if (e?.code === 4001) {
                        show('已取消切换网络', { type: 'error' })
                      } else {
                        show('请在钱包中手动切换到指定网络后重试', { type: 'error' })
                      }
                    }
                  }}
                >切换</button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
