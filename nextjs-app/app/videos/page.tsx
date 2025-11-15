"use client"
import Header from '@/components/layout/Header'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useCallback } from 'react'
import { getQueryConfig } from '@/lib/config'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function VideosPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">会议回放</h1>
          <p className="text-muted-foreground mb-6">
            观看社区技术分享和活动回放视频
          </p>

          <Suspense fallback={<div className="text-xs text-gray-500">加载中...</div>}>
            <VideosList />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

function VideosList() {
  const sp = useSearchParams()
  const [querySnapshot] = useState({ q: sp.get('q') || '', tag: sp.get('tag') || '' })
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (querySnapshot.q) params.set('q', querySnapshot.q)
    if (querySnapshot.tag) params.set('tag', querySnapshot.tag)
    return `/api/content/videos?${params.toString()}`
  }, [querySnapshot])
  const queryConfig = getQueryConfig()
  const { data, error, isFetching } = useQuery({
    queryKey: ['videos', querySnapshot.q, querySnapshot.tag],
    queryFn: () => fetcher(buildUrl()),
    ...queryConfig
  })
  const videos = (data?.data || []) as any[]

  return (
    <>
      <div className="mb-6 text-xs text-gray-500 flex items-center gap-3">
        {isFetching ? <span className="animate-pulse">同步最新数据中...</span> : <span>已加载 {videos.length} 条</span>}
        {error && <span className="text-red-500">加载出错</span>}
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">暂无视频，敬请期待</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              {video.metadata?.imageUrl ? (
                <div className="relative w-full h-48">
                  <Image
                    src={video.metadata.imageUrl}
                    alt={video.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl">
                  ▶️
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{video.title}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {video.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </p>

                {video.metadata?.videoUrl && (
                  <a
                    href={video.metadata.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    观看视频
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
