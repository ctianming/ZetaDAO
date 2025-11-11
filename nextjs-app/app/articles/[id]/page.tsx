import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import ClientActions from './client-actions'
import { PublishedContent } from '@/types'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { mapPublishedRow } from '@/lib/transform'
import { markdownToHtml } from '@/lib/markdown'
import AuthorCard from '@/components/content/AuthorCard'
import AuthorInline from '@/components/content/AuthorInline'
import ShareButtons from '@/components/content/ShareButtons'
import Image from 'next/image'

interface PageProps {
  params: {
    id: string
  }
}

async function getArticle(id: string): Promise<PublishedContent | null> {
  const { data, error } = await supabase
    .from('published_content')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching article:', error)
    return null
  }

  // 浏览次数通过 API 记录并触发 XP 逻辑
  // 注意：此处是服务端渲染，改为客户端触发以避免 SSR 时重复计数

  return mapPublishedRow(data)
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const article = await getArticle(params.id)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          {/* 文章头部 */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>发布于 {formatDate(article.publishedAt)}</span>
              <span>•</span>
              <span>{article.views || 0} 次浏览</span>
        {article.authorUid && (
                <>
                  <span>•</span>
                  <AuthorInline uid={article.authorUid} name={article.authorName || '用户'} avatarUrl={(article as any).authorAvatarUrl || undefined} />
                </>
              )}
            </div>

      {article.metadata?.tags && article.metadata.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
        {article.metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* 分享按钮 */}
          <ShareButtons title={article.title} tags={article.metadata?.tags || []} imageUrl={article.metadata?.imageUrl || null} className="mb-6 flex items-center gap-2 flex-wrap" />

          {/* 文章封面图 */}
          {article.metadata?.imageUrl && (
            <div className="relative w-full h-64 mb-8">
              <Image
                src={article.metadata.imageUrl}
                alt={article.title}
                fill
                unoptimized
                className="object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* 文章内容 */}
          <div className="prose prose-lg max-w-none">
            {/* 支持 Markdown 渲染（后端存的是 md 或 html 均可）*/}
            {/* 优先尝试将原文作为 markdown 渲染，若渲染为空则使用原 HTML */}
            {(() => {
              const mdHtml = markdownToHtml(article.content || '')
              const html = mdHtml?.trim() ? mdHtml : (article.content || '')
              return <div dangerouslySetInnerHTML={{ __html: html }} />
            })()}
          </div>

          {/* Tip & View client actions */}
          <ClientActions contentId={article.id} />

          {/* 作者卡片与关注 */}
          {article.authorUid && (
            <div className="mt-10">
              <AuthorCard uid={article.authorUid} />
            </div>
          )}

          {/* 外部链接 */}
      {article.metadata?.externalLink && (
            <div className="mt-8 p-6 bg-primary-50 rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">相关链接</p>
              <a
        href={article.metadata.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
        {article.metadata.externalLink}
              </a>
            </div>
          )}
        </article>
      </main>
    </div>
  )
}

// moved client component to './client-actions' to satisfy Next.js "use client" directive rules
