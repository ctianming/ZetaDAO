import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { PublishedContent } from '@/types'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { mapPublishedRow } from '@/lib/transform'

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

  // 增加浏览次数
  await supabase
    .from('published_content')
    .update({ views: (data.views || 0) + 1 })
    .eq('id', id)

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
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>发布于 {formatDate(article.publishedAt)}</span>
              <span>•</span>
              <span>{article.views || 0} 次浏览</span>
        {article.authorName && (
                <>
                  <span>•</span>
          <span>作者：{article.authorName}</span>
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

          {/* 文章封面图 */}
      {article.metadata?.imageUrl && (
            <img
        src={article.metadata.imageUrl}
              alt={article.title}
              className="w-full rounded-2xl mb-8 shadow-lg"
            />
          )}

          {/* 文章内容 */}
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

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
