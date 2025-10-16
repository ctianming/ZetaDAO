import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { PublishedContent } from '@/types'
import ArticleCard from '@/components/content/ArticleCard'
import { mapPublishedRows } from '@/lib/transform'
import ArticlesFilter from '@/components/content/ArticlesFilter'

export const revalidate = 60 // ISR: 每60秒重新验证

async function getArticles(params: { articleCategory?: string; tag?: string; q?: string }): Promise<PublishedContent[]> {
  let query = supabase
    .from('published_content')
    .select('*')
    .eq('category', 'article')

  if (params.articleCategory) {
    query = query.eq('article_category', params.articleCategory)
  }
  if (params.tag) {
    query = query.overlaps('tags', [params.tag])
  }
  if (params.q) {
    const q = params.q.trim()
    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      const maybeTag = q.startsWith('#') ? q.slice(1) : q
      if (maybeTag) query = query.overlaps('tags', [maybeTag])
    }
  }

  const { data, error } = await query.order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching articles:', error)
    return []
  }
  return mapPublishedRows(data)
}

export default async function ArticlesPage({ searchParams }: { searchParams?: { articleCategory?: string; tag?: string; q?: string } }) {
  // fetch categories server-side
  let categories: any[] = []
  try {
    const { data, error } = await supabase
      .from('article_categories')
      .select('slug,name')
      .order('name', { ascending: true })
    if (!error && data) categories = data as any[]
  } catch (e) {
    console.error('Error fetching categories:', e)
  }

  const articles = await getArticles({
    articleCategory: searchParams?.articleCategory,
    tag: searchParams?.tag,
    q: searchParams?.q,
  })

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">技术文章</h1>
          <p className="text-muted-foreground mb-12">
            深入了解 ZetaChain 技术架构和最佳实践
          </p>

          <ArticlesFilter
            initialArticleCategory={searchParams?.articleCategory || ''}
            initialTag={searchParams?.tag || ''}
            initialQ={searchParams?.q || ''}
            categories={categories?.map(c => ({ slug: c.slug, name: c.name })) || []}
          />

          {articles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">暂无文章，敬请期待</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
