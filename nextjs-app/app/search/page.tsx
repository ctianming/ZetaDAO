import Header from '@/components/layout/Header'
import SearchClient from './search-client'
import { Suspense } from 'react'

export default function SearchPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<div className="text-sm text-gray-500">加载中...</div>}>
            <SearchClient />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
