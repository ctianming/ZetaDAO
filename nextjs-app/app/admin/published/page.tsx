"use client"

import { useState, useEffect, useCallback } from 'react'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'
import { useToast } from '@/components/ui/Toast'
import { Trash2, ExternalLink, Filter } from 'lucide-react'

interface PublishedContent {
  id: string
  type: 'article' | 'video' | 'activity'
  title: string
  content?: string
  published_at: string
  submission_id?: string
  author_name?: string
  author_wallet?: string
}

export default function PublishedContentManagementPage() {
  const { isAdmin, loading: authLoading } = useEnsureAdminSession()
  const { show } = useToast()
  
  const [contents, setContents] = useState<PublishedContent[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const res = await fetch(`/api/admin/published?${params}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '获取内容失败')
      }

      setContents(json.data || [])
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (err: any) {
      show(err.message || '获取内容失败', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, show])

  useEffect(() => {
    if (isAdmin) {
      fetchContents()
    }
  }, [isAdmin, fetchContents])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/published/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '删除失败')
      }

      show('内容已删除', { type: 'success' })
      setDeleteConfirm(null)
      fetchContents() // Refresh the list
    } catch (err: any) {
      show(err.message || '删除失败', { type: 'error' })
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'article': return '文章'
      case 'video': return '视频'
      case 'activity': return '活动'
      default: return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'article': return 'bg-blue-100 text-blue-800'
      case 'video': return 'bg-purple-100 text-purple-800'
      case 'activity': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证管理员权限...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">访问受限</h2>
          <p className="text-gray-600 mb-6">您没有权限访问此页面</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">已发布内容管理</h1>
          <p className="text-gray-600">查看和管理所有已发布的文章、视频和活动</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              {['all', 'article', 'video', 'activity'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? '全部' : getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : contents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">暂无已发布的内容</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(
                          content.type
                        )}`}
                      >
                        {getTypeLabel(content.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(content.published_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {content.title}
                    </h3>
                    {content.content && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {content.content.substring(0, 150)}...
                      </p>
                    )}
                    {content.author_name && (
                      <div className="text-sm text-gray-500">
                        作者: {content.author_name}
                        {content.author_wallet && (
                          <span className="ml-2 font-mono text-xs">
                            ({content.author_wallet.substring(0, 6)}...
                            {content.author_wallet.substring(38)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={`/${content.type === 'article' ? 'articles' : content.type === 'video' ? 'videos' : 'activities'}/${content.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="查看内容"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => setDeleteConfirm(content.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除内容"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">确认删除</h3>
              <p className="text-gray-600 mb-6">
                确定要删除这条内容吗？此操作不可撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
