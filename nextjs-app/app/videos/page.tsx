import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { PublishedContent } from '@/types'
import { mapPublishedRows } from '@/lib/transform'

export const revalidate = 60

async function getVideos(params: { q?: string; tag?: string } = {}): Promise<PublishedContent[]> {
  let query = supabase
    .from('published_content')
    .select('*')
    .eq('category', 'video')

  const q = params.q?.trim()
  const tag = params.tag?.trim()
  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    const maybeTag = q.startsWith('#') ? q.slice(1) : q
    if (maybeTag) query = query.overlaps('tags', [maybeTag])
  }
  if (tag) {
    query = query.overlaps('tags', [tag])
  }

  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) {
    console.error('Error fetching videos:', error)
    return []
  }
  return mapPublishedRows(data)
}

export default async function VideosPage({ searchParams }: { searchParams?: { q?: string; tag?: string } }) {
  const videos = await getVideos({ q: searchParams?.q, tag: searchParams?.tag })

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">会议回放</h1>
          <p className="text-muted-foreground mb-6">
            观看社区技术分享和活动回放视频
          </p>

          {/* 简易搜索栏 */}
          <form className="mb-8 flex flex-col md:flex-row gap-3 md:items-end" action="/videos">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-muted-foreground mb-1">关键词</label>
              <input
                name="q"
                placeholder="搜索标题/内容或 #标签"
                defaultValue={searchParams?.q || ''}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">标签</label>
              <input
                name="tag"
                placeholder="例如 zeta"
                defaultValue={searchParams?.tag || ''}
                className="border rounded-lg px-3 py-2 w-48"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">筛选</button>
          </form>

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
                    <img
            src={video.metadata.imageUrl}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
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
        </div>
      </main>
    </div>
  )
}
