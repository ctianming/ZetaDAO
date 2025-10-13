'use client'

import Link from 'next/link'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useAccount, useSignMessage } from 'wagmi'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const { data: session } = useSession()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()

  const navItems = [
    { name: '首页', href: '/' },
    { name: '文章', href: '/articles' },
    { name: '视频', href: '/videos' },
    { name: '活动', href: '/activities' },
    { name: '大使', href: '/ambassadors' },
    { name: '投稿', href: '/submit' },
  { name: '个人资料', href: '/profile' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
            Z
          </div>
          <span className="hidden font-bold sm:inline-block gradient-text text-xl">
            ZetaDAO
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary-500"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 relative">
          {session?.user ? (
            <>
              <Link href="/profile" className="text-sm text-gray-700 hover:text-primary-600">{session.user?.name || session.user?.email || '个人资料'}</Link>
              <button onClick={() => signOut()} className="text-sm text-gray-700 hover:text-primary-600">退出</button>
            </>
          ) : (
            <button onClick={() => { setLoginError(''); setLoginOpen(true) }} className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">登录</button>
          )}

          {loginOpen && (
            <div className="absolute right-0 top-10 w-[620px] bg-white border rounded-xl shadow-xl p-4 z-50">
              <div className="font-medium mb-3">登录或注册</div>
              {loginError && <div className="text-red-600 text-xs mb-2">{loginError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 左侧：用户名/邮箱+密码登录 + 注册 */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-2">使用用户名/邮箱登录</div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.currentTarget as HTMLFormElement
                      const fd = new FormData(form)
                      const identifier = String(fd.get('identifier') || '')
                      const password = String(fd.get('password') || '')
                      setLoginLoading(true)
                      setLoginError('')
                      const res = await signIn('password', { identifier, password, redirect: false })
                      if (res?.error) setLoginError('账号或密码错误，或邮箱未验证')
                      else setLoginOpen(false)
                      setLoginLoading(false)
                    }}
                    className="space-y-2"
                  >
                    <input name="identifier" placeholder="用户名或邮箱" className="w-full px-3 py-2 border rounded" />
                    <input name="password" type="password" placeholder="密码" className="w-full px-3 py-2 border rounded" />
                    <button className="w-full px-3 py-2 bg-primary-500 text-white rounded disabled:opacity-50" disabled={loginLoading}>登录</button>
                  </form>
                  <div className="mt-3 border-t pt-3">
                    <div className="text-sm text-muted-foreground mb-2">没有账号？邮箱注册</div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const form = e.currentTarget as HTMLFormElement
                        const fd = new FormData(form)
                        const email = String(fd.get('reg_email') || '')
                        const password = String(fd.get('reg_password') || '')
                        const username = String(fd.get('reg_username') || '')
                        setLoginError('')
                        setLoginLoading(true)
                        const resp = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, username }) })
                        const json = await resp.json()
                        if (!resp.ok || !json.success) setLoginError(json.error || '注册失败')
                        else alert('注册成功，已发送验证邮件（开发环境直接返回验证码）。请完成验证后再登录。' + (json.devCode ? ` 验证码：${json.devCode}` : ''))
                        setLoginLoading(false)
                      }}
                      className="space-y-2"
                    >
                      <input name="reg_username" placeholder="用户名（可选）" className="w-full px-3 py-2 border rounded" />
                      <input name="reg_email" placeholder="邮箱" className="w-full px-3 py-2 border rounded" />
                      <input name="reg_password" type="password" placeholder="密码" className="w-full px-3 py-2 border rounded" />
                      <button className="w-full px-3 py-2 bg-emerald-500 text-white rounded disabled:opacity-50" disabled={loginLoading}>注册</button>
                    </form>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const form = e.currentTarget as HTMLFormElement
                        const fd = new FormData(form)
                        const email = String(fd.get('v_email') || '')
                        const code = String(fd.get('v_code') || '')
                        setLoginError('')
                        setLoginLoading(true)
                        const resp = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) })
                        const json = await resp.json()
                        if (!resp.ok || !json.success) setLoginError(json.error || '验证失败')
                        else alert('邮箱验证成功，请使用账号密码登录')
                        setLoginLoading(false)
                      }}
                      className="space-y-2 mt-3"
                    >
                      <div className="text-xs text-muted-foreground">验证邮箱</div>
                      <input name="v_email" placeholder="邮箱" className="w-full px-3 py-2 border rounded" />
                      <input name="v_code" placeholder="验证码" className="w-full px-3 py-2 border rounded" />
                      <button className="w-full px-3 py-2 bg-indigo-500 text-white rounded disabled:opacity-50" disabled={loginLoading}>提交验证码</button>
                    </form>
                  </div>
                </div>

                {/* 右侧：Google + 钱包登录 */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-2">第三方快速登录</div>
                  <div className="space-y-2">
                    <button onClick={() => { setLoginOpen(false); signIn('google') }} className="w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50">使用 Google 登录</button>
                    <button
                      onClick={async () => {
                        setLoginError('')
                        try {
                          setLoginLoading(true)
                          if (!isConnected || !address) {
                            await openConnectModal?.()
                            return
                          }
                          const nonceRes = await fetch('/api/auth/wallet/nonce', { cache: 'no-store' })
                          const { nonce } = await nonceRes.json()
                          const message = `Sign-in to ZetaDAO\n\nNonce: ${nonce}`
                          const signature = await signMessageAsync({ message })
                          const res = await signIn('credentials', { address, message, signature, redirect: false })
                          if (res?.error) setLoginError('钱包登录失败，请重试')
                          else setLoginOpen(false)
                        } catch (e) {
                          setLoginError('钱包登录失败，请重试')
                        } finally {
                          setLoginLoading(false)
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      disabled={loginLoading}
                    >
                      使用钱包登录{loginLoading ? '中…' : ''}
                    </button>
                    <button onClick={() => setLoginOpen(false)} className="w-full text-center text-sm text-gray-600 hover:text-gray-800">取消</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
          </nav>
        </div>
      )}
    </header>
  )
}
