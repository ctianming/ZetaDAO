'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Props {
  initialArticleCategory?: string
  initialTag?: string
  initialQ?: string
  categories?: { slug: string; name: string }[]
}

export default function ArticlesFilter({ initialArticleCategory = '', initialTag = '', initialQ = '', categories = [] }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [articleCategory, setArticleCategory] = useState(initialArticleCategory)
  const [tag, setTag] = useState(initialTag)
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    setArticleCategory(initialArticleCategory)
    setTag(initialTag)
  }, [initialArticleCategory, initialTag])

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(sp?.toString() || '')
    if (articleCategory) params.set('articleCategory', articleCategory)
    else params.delete('articleCategory')
    if (tag) params.set('tag', tag)
    else params.delete('tag')
    if (q) params.set('q', q)
    else params.delete('q')
    router.push(`/articles?${params.toString()}`)
  }

  return (
    <form onSubmit={apply} className="mb-6 flex flex-col md:flex-row gap-3 md:items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm text-muted-foreground mb-1">关键词</label>
        <input
          placeholder="搜索标题/内容或 #标签"
          className="border rounded-lg px-3 py-2 w-full"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">分类</label>
        <select
          className="border rounded-lg px-3 py-2 w-48"
          value={articleCategory}
          onChange={(e) => setArticleCategory(e.target.value)}
        >
          <option value="">全部</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">标签</label>
        <input
          placeholder="例如 zeta"
          className="border rounded-lg px-3 py-2 w-48"
          value={tag}
          onChange={(e) => setTag(e.target.value.trim())}
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">筛选</button>
    </form>
  )
}
