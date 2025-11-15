'use client'

export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OnboardPage() {
  const { data: session } = useSession()
  const uid = (session as any)?.uid as string | undefined
  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCounter, setResendCounter] = useState(0)

  useEffect(() => {
    if (resendCounter <= 0) return
    const t = setTimeout(() => setResendCounter(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCounter])

  useEffect(() => {
    // 如果已登录且已有用户名，则无需引导
    const check = async () => {
      if (!uid) return
      try {
        const r = await fetch(`/api/user?uid=${uid}`, { cache: 'no-store' })
        const j = await r.json()
        if (j?.data?.user?.username) window.location.replace('/')
      } catch {}
    }
    check()
  }, [uid])

  const submitForm = async () => {
    setError(''); setLoading(true)
    try {
      // 1) 注册本地账号（邮箱+密码），发送验证码
      const resp = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      })
      const json = await resp.json()
      if (!resp.ok || !json.success) { setError(json.error || '注册失败'); return }
      // 2) 进入验证码步骤
      setStep('verify')
      setResendCounter(60)
    } finally { setLoading(false) }
  }

  const verifyCode = async () => {
    setError(''); setLoading(true)
    try {
      // 1) 验证邮箱验证码
      const resp = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const json = await resp.json()
      if (!resp.ok || !json.success) { setError(json.error || '验证失败'); return }
      // 2) 给当前钱包设置用户名
      if (!uid) { setError('未检测到登录会话'); return }
      const r2 = await fetch('/api/user', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, username }),
      })
      const j2 = await r2.json()
      if (!j2?.success) { setError(j2?.error || '保存用户名失败'); return }
      setStep('done')
      // Refresh session to update user data
      window.location.reload()
    } finally { setLoading(false) }
  }

  const resend = async () => {
    setError(''); setLoading(true)
    try {
      const resp = await fetch('/api/auth/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await resp.json()
      if (!resp.ok || !json.success) setError(json.error || '重发失败')
      else setResendCounter(60)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto bg-white border rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold mb-2">首次设置</h1>
          <p className="text-sm text-gray-600 mb-6">为你的钱包账号设置用户名，并创建邮箱+密码（可选的第二登录方式）。</p>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">用户名</label>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="例如：Alice" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">邮箱</label>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input className="w-full border rounded-lg px-3 py-2" type="password" placeholder="至少 8 位" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button onClick={submitForm} disabled={loading || !username || !email || !password} className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-60">
                {loading ? '提交中…' : '提交并发送验证码'}
              </button>
              <div className="text-xs text-gray-500">提交后我们会向你的邮箱发送验证码，用于验证所有权。</div>
            </div>
          )}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">验证码已发送至：<span className="font-medium">{email}</span></div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">验证码</label>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="6 位验证码" value={code} onChange={e => setCode(e.target.value)} />
              </div>
              <button onClick={verifyCode} disabled={loading || !code} className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60">
                {loading ? '验证中…' : '提交验证并完成'}
              </button>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>未收到？检查垃圾箱或稍后重试。</span>
                <button onClick={resend} disabled={loading || resendCounter>0} className={`underline ${resendCounter>0 ? 'opacity-60 cursor-not-allowed' : 'hover:text-gray-800'}`}>
                  {resendCounter>0 ? `重发验证码(${resendCounter}s)` : '重发验证码'}
                </button>
              </div>
            </div>
          )}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                设置完成！你已为钱包账号设置用户名，并可用邮箱+密码作为备用登录方式。
              </div>
              <div className="flex gap-3">
                <Link href="/" className="px-4 py-2 rounded-lg border hover:bg-gray-50">返回首页</Link>
                <Link href="/profile" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">查看个人资料</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
