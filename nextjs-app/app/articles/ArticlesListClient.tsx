"use client"
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ArticleCard from '@/components/content/ArticleCard'
import { getQueryConfig } from '@/lib/config'

export default function ArticlesListClient({ initialParams }: { initialParams: { articleCategory: string; tag: string; q: string } }) {
  const params = useMemo(() => {
    const usp = new URLSearchParams()
    if (initialParams.articleCategory) usp.set('articleCategory', initialParams.articleCategory)
    if (initialParams.tag) usp.set('tag', initialParams.tag)
    if (initialParams.q) usp.set('q', initialParams.q)
    return usp
  }, [initialParams])
  const url = `/api/content/articles?${params.toString()}`
  const queryConfig = getQueryConfig()
  const { data, error, isLoading } = useQuery({
    queryKey: ['articles', params.toString()],
    queryFn: () => fetch(url).then(r => r.json()),
    ...queryConfig
  })
  const articles = (data?.data || []) as any[]

  if (isLoading) {
    return <div className="text-center py-20"><p className="text-muted-foreground text-lg">加载中...</p></div>
  }
  
  if (error) {
    return <div className="text-center py-20"><p className="text-red-500 text-lg">加载失败，请稍后重试</p></div>
  }

  if ((articles?.length || 0) === 0) {
    return <div className="text-center py-20"><p className="text-muted-foreground text-lg">暂无文章，敬请期待</p></div>
  }

  return (
    <div className="grid gap-6">
      {articles.map((article: any) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}
