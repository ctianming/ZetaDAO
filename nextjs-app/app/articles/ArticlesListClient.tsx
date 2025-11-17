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
  const hackathonArticle = {
    id: 'zetachain-hackathon',
    title: 'ZetaChain × 阿里云「通用 AI」共学黑客松正式启动！',
    content: 'ZetaChain 与阿里云共同发起「通用 AI」共学黑客松：一场融合 AI 与通用区块链创新的共学与开发计划...',
    publishedAt: '2024-011-17T10:00:00Z',
    authorName: 'zetachain-CN',
    authorUid: 'zetachain-cn',
    authorAvatarUrl: null,
    views: 17,
    likes: 3,
    metadata: {
      imageUrl: '/images/ZetaChain_x_Alibaba_Cloud_-_Chinese.webp',
      tags: ['ZetaChain', 'Hackathon', 'AI'],
    },
  };

  const articles = useMemo(() => {
    const fetchedArticles = (data?.data || []) as any[];
    // Only show the hardcoded article on the main, unfiltered page
    if (!initialParams.articleCategory && !initialParams.tag && !initialParams.q) {
      // Prevent duplicates if the article is ever added to the backend
      const isHackathonArticleFetched = fetchedArticles.some(a => a.id === hackathonArticle.id);
      if (!isHackathonArticleFetched) {
        return [hackathonArticle, ...fetchedArticles];
      }
    }
    return fetchedArticles;
  }, [data, initialParams, hackathonArticle]);

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
