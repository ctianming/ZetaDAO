'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ContentCategory } from '@/types'

export default function SubmitPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([])
  
  const [formData, setFormData] = useState({
    category: 'article' as ContentCategory,
    title: '',
    content: '',
    tags: '',
    imageUrl: '',
    videoUrl: '',
    externalLink: '',
  articleCategory: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      setError('请先连接钱包')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: address,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '投稿失败')
      }

      alert('投稿成功！等待管理员审核')
      router.push('/')
    } catch (err: any) {
      setError(err.message || '投稿失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }
  useEffect(() => {
    // fetch available article categories
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' })
        const json = await res.json()
        if (json?.data) setCategories(json.data)
      } catch {}
    }
    fetchCategories()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">投稿系统</h1>
            <p className="text-muted-foreground mb-8">
              请先连接钱包以使用投稿功能
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">提交内容</h1>
          <p className="text-muted-foreground mb-8">
            分享您的技术见解、视频内容或活动信息
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-lg">
            {/* 类别选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">内容类型</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="article">技术文章</option>
                <option value="video">视频内容</option>
                <option value="activity">社区活动</option>
              </select>
            </div>

            {/* 标题 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">标题</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="输入内容标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* 内容 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">内容</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="输入详细内容（支持HTML）"
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                支持 HTML 标签，可以包含图片、链接等
              </p>
            </div>

            {/* 文章分类（仅文章时显示） */}
            {formData.category === 'article' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">文章分类（可选）</label>
                <select
                  name="articleCategory"
                  value={formData.articleCategory}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">请选择分类</option>
                  {categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 标签 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">标签（可选）</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="多个标签用逗号分隔，例如：跨链,DeFi,教程"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 封面图 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">封面图URL（可选）</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 视频链接 */}
            {formData.category === 'video' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">视频URL</label>
                <input
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {/* 外部链接 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">相关链接（可选）</label>
              <input
                type="url"
                name="externalLink"
                value={formData.externalLink}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isSubmitting ? '提交中...' : '提交投稿'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
