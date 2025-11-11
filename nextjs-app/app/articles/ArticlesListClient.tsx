"use client"
import { useMemo } from 'react'
import useSWR from 'swr'
import ArticleCard from '@/components/content/ArticleCard'
import { getSWRConfig } from '@/lib/config'

export default function ArticlesListClient({ initialParams }: { initialParams: { articleCategory: string; tag: string; q: string } }) {
  const params = useMemo(() => {
    const usp = new URLSearchParams()
    if (initialParams.articleCategory) usp.set('articleCategory', initialParams.articleCategory)
    if (initialParams.tag) usp.set('tag', initialParams.tag)
    if (initialParams.q) usp.set('q', initialParams.q)
    return usp
  }, [initialParams])
  const url = `/api/content/articles?${params.toString()}`
  const swrCfg = getSWRConfig()
  const { data, error, isValidating } = useSWR(url, (u)=>fetch(u).then(r=>r.json()), swrCfg)
  const articles = (data?.data || []) as any[]

  if (!data && isValidating) {
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
