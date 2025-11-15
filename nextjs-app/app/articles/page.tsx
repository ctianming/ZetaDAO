import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import ArticlesFilter from '@/components/content/ArticlesFilter'
import ArticlesListClient from '@/app/articles/ArticlesListClient'

// Use dynamic rendering to avoid build-time fetch issues
export const dynamic = 'force-dynamic'
export const revalidate = 60 // ISR兜底：每60秒再生一次

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

  const initialParams = {
    articleCategory: searchParams?.articleCategory || '',
    tag: searchParams?.tag || '',
    q: searchParams?.q || '',
  }

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

          <ArticlesListClient initialParams={initialParams} />
        </div>
      </main>
    </div>
  )
}

