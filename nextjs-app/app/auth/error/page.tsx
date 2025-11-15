'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

// This is the Client Component that uses the hook
function AuthErrorContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') || 'OAuthSignin'
  const isNetwork = /timeout|ECONN|ENOTFOUND|TLS|socket/i.test(error)
  const isOAuthNotLinked = error === 'OAuthAccountNotLinked'

  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-2">
        {isOAuthNotLinked ? '账号未注册' : '登录遇到问题'}
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        {isOAuthNotLinked
          ? '此 Google 账号尚未注册。请先使用邮箱注册账号，然后在个人设置中绑定 Google 账号。'
          : isNetwork
            ? '网络连接不稳定，无法连接到 Google。'
            : '第三方登录暂时不可用或被中断。'}
      </p>
      {isOAuthNotLinked ? (
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-5">
          <li>使用邮箱和密码注册新账号</li>
          <li>登录后在个人设置中绑定 Google 账号</li>
          <li>绑定后即可使用 Google 快速登录</li>
        </ul>
      ) : (
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-5">
          <li>请检查网络或稍后重试。</li>
          <li>可尝试切换浏览器/网络或关闭代理。</li>
          <li>也可以使用 邮箱+密码 登录。</li>
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="px-3 py-2 rounded-lg border hover:bg-gray-50">返回首页</Link>
        {isOAuthNotLinked ? (
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('zd-open-login'))
              }
            }}
            className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            去注册
          </button>
        ) : (
          <Link
            href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL || '/')}`}
            className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            重试 Google 登录
          </Link>
        )}
      </div>
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 text-xs text-gray-500">
          错误代码：<code className="px-1 py-0.5 bg-gray-100 rounded">{error}</code>
        </div>
      )}
      {session && (
        <div className="mt-4 text-xs text-emerald-600">你已登录为 {session.user?.email || (session as any).walletAddress}</div>
      )}
    </div>
  )
}

// This is the main Page component, which is a Server Component by default
export default function AuthErrorPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Suspense fallback={<div className="w-full max-w-md h-72 rounded-2xl border bg-white p-6 shadow-sm animate-pulse" />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
}
