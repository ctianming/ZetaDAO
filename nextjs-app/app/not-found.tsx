'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'

const Header = dynamic(() => import('@/components/layout/Header'), { ssr: false })

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm p-8 text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">页面未找到</h2>
          <p className="text-gray-600 mb-6">
            抱歉，您访问的页面不存在或已被移除。
          </p>
          <Link 
            href="/" 
            className="inline-block px-6 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </main>
    </div>
  )
}

