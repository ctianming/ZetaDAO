'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { Submission } from '@/types'
import { formatDate, truncateAddress } from '@/lib/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PromptDialog from '@/components/ui/PromptDialog'
import { useToast } from '@/components/ui/Toast'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { show } = useToast()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [catList, setCatList] = useState<{ id: string; slug: string; name: string; description?: string }[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [catForm, setCatForm] = useState<{ id?: string; slug: string; name: string; description?: string }>({ slug: '', name: '' })
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{ id?: string; slug: string; name?: string } | null>(null)
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [promptReject, setPromptReject] = useState<{ open: boolean; id?: string } | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/submissions?status=${filter}`, {
        headers: {
          'x-wallet-address': address || '',
        },
      })

      const data = await response.json()
      if (data.success) {
        setSubmissions(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }, [address, filter])

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true)
      const res = await fetch('/api/categories', {
        headers: { 'x-wallet-address': address || '' },
        cache: 'no-store',
      })
      const json = await res.json()
      if (json?.data) setCatList(json.data)
    } catch (error) {
      console.error('Error fetching categories', error)
    } finally {
      setCatLoading(false)
    }
  }, [address])

  useEffect(() => {
    const checkAndFetch = async () => {
      if (!isConnected || !address) {
        router.push('/')
        return
      }
      try {
        const res = await fetch('/api/auth/is-admin', {
          headers: { 'x-wallet-address': address },
          cache: 'no-store',
        })
        const json = await res.json()
        if (!json.isAdmin) {
          show('需要管理员权限', { type: 'error' })
          router.push('/')
          return
        }
        fetchSubmissions()
        fetchCategories()
      } catch (error) {
        console.error('Admin check failed', error)
        show('管理员校验失败', { type: 'error' })
        router.push('/')
      }
    }
    checkAndFetch()
  }, [isConnected, address, router, show, fetchSubmissions, fetchCategories])

  const saveCategory = async () => {
    try {
      const method = catForm.id ? 'PUT' : 'POST'
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': address || '' },
        body: JSON.stringify(catForm),
      })
      const json = await res.json()
      if (json.success) {
        setCatForm({ slug: '', name: '' })
        fetchCategories()
      } else {
        show(json.error || '保存失败', { type: 'error' })
      }
    } catch (error) {
      console.error('save category failed', error)
      show('保存失败', { type: 'error' })
    }
  }

  const editCategory = (c: { id: string; slug: string; name: string; description?: string }) => {
    setCatForm({ id: c.id, slug: c.slug, name: c.name, description: c.description })
  }

  const deleteCategory = async (c: { id: string; slug: string; name?: string }) => {
    setConfirmDeleteCat(c)
  }

  const handleApprove = async (submissionId: string) => {
    setConfirmApproveId(submissionId)
  }

  const handleReject = async (submissionId: string) => {
    setPromptReject({ open: true, id: submissionId })
  }

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 gradient-text">管理员审核面板</h1>

          {/* 分类管理 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">分类管理</h2>
            </div>
            {/* 表单 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                placeholder="slug（唯一标识，例如 jichu）"
                className="border rounded-lg px-3 py-2"
                value={catForm.slug}
                onChange={(e) => setCatForm((s) => ({ ...s, slug: e.target.value }))}
              />
              <input
                placeholder="名称（例如 基础）"
                className="border rounded-lg px-3 py-2"
                value={catForm.name}
                onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                placeholder="描述（可选）"
                className="border rounded-lg px-3 py-2"
                value={catForm.description || ''}
                onChange={(e) => setCatForm((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="flex gap-2">
                <button onClick={saveCategory} className="px-4 py-2 bg-primary-500 text-white rounded-lg">{catForm.id ? '更新' : '创建'}</button>
                {catForm.id && (
                  <button onClick={() => setCatForm({ slug: '', name: '' })} className="px-4 py-2 border rounded-lg">取消</button>
                )}
              </div>
            </div>

            {/* 列表 */}
            {catLoading ? (
              <p className="text-muted-foreground">加载分类...</p>
            ) : catList.length === 0 ? (
              <p className="text-muted-foreground">暂无分类</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">名称</th>
                      <th className="py-2 pr-4">slug</th>
                      <th className="py-2 pr-4">描述</th>
                      <th className="py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catList.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.slug}</td>
                        <td className="py-2 pr-4">{c.description || '-'}</td>
                        <td className="py-2 space-x-2">
                          <button onClick={() => editCategory(c)} className="px-3 py-1 border rounded">编辑</button>
                          <button onClick={() => deleteCategory(c)} className="px-3 py-1 border rounded text-red-600">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 筛选按钮 */}
          <div className="flex gap-4 mb-8">
            {(['pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'pending' && '待审核'}
                {status === 'approved' && '已批准'}
                {status === 'rejected' && '已拒绝'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl">
              <p className="text-muted-foreground text-lg">暂无投稿</p>
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-2xl p-6 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold mb-2">
                        {submission.title}
                      </h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>类别：{submission.category}</span>
                        <span>•</span>
                        <span>投稿者：{truncateAddress(submission.walletAddress)}</span>
                        <span>•</span>
                        <span>{formatDate(submission.submittedAt)}</span>
                      </div>
                    </div>
                    
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        submission.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : submission.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {submission.status === 'pending' && '待审核'}
                      {submission.status === 'approved' && '已批准'}
                      {submission.status === 'rejected' && '已拒绝'}
                    </span>
                  </div>

                  <div
                    className="prose max-w-none mb-4"
                    dangerouslySetInnerHTML={{
                      __html: submission.content.substring(0, 300) + '...',
                    }}
                  />

                  {submission.metadata?.tags && submission.metadata.tags.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {submission.metadata.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 文章分类（仅当为文章且提供了分类） */}
                  {submission.category === 'article' && submission.metadata?.articleCategory && (
                    <div className="mb-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                        分类：{submission.metadata.articleCategory}
                      </span>
                    </div>
                  )}

                  {submission.status === 'pending' && (
                    <div className="flex gap-4 border-t border-gray-200 pt-4">
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      >
                        ✓ 批准
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        ✗ 拒绝
                      </button>
                    </div>
                  )}

                  {submission.status === 'approved' && submission.reviewedBy && (
                    <div className="text-sm text-muted-foreground border-t border-gray-200 pt-4">
                      审核者：{truncateAddress(submission.reviewedBy)} •{' '}
                      {submission.reviewedAt && formatDate(submission.reviewedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {/* Modals */}
      <ConfirmDialog
        open={!!confirmDeleteCat}
        title="删除分类"
        description={`确认删除分类 ${confirmDeleteCat?.name || confirmDeleteCat?.slug} 吗？`}
        onCancel={() => setConfirmDeleteCat(null)}
        onConfirm={async () => {
          if (!confirmDeleteCat) return
          try {
            const url = confirmDeleteCat.id ? `/api/categories?id=${encodeURIComponent(confirmDeleteCat.id)}` : `/api/categories?slug=${encodeURIComponent(confirmDeleteCat.slug)}`
            const res = await fetch(url, { method: 'DELETE', headers: { 'x-wallet-address': address || '' } })
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
              show('已删除分类', { type: 'success' })
              fetchCategories()
            } else {
              show(json.error || '删除失败', { type: 'error' })
            }
          } catch (error) {
            console.error('delete category failed', error)
            show('删除失败', { type: 'error' })
          } finally {
            setConfirmDeleteCat(null)
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmApproveId}
        title="批准投稿"
        description="确认批准这个投稿吗？批准后将立即发布。"
        onCancel={() => setConfirmApproveId(null)}
        onConfirm={async () => {
          if (!confirmApproveId) return
          try {
            const response = await fetch('/api/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-wallet-address': address || '' },
              body: JSON.stringify({ submissionId: confirmApproveId }),
            })
            const data = await response.json()
            if (data.success) {
              show('审核通过！内容已发布', { type: 'success' })
              fetchSubmissions()
            } else {
              show(data.error || '操作失败', { type: 'error' })
            }
          } catch (error) {
            console.error('Error approving:', error)
            show('操作失败', { type: 'error' })
          } finally {
            setConfirmApproveId(null)
          }
        }}
      />

      <PromptDialog
        open={!!promptReject?.open}
        title="拒绝投稿"
        description="请输入拒绝原因（可选）"
        placeholder="例如：内容质量不达标"
        confirmText="提交"
        onCancel={() => setPromptReject(null)}
        onConfirm={async (reason) => {
          const submissionId = promptReject?.id
          setPromptReject(null)
          if (!submissionId) return
          try {
            const response = await fetch('/api/reject', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-wallet-address': address || '' },
              body: JSON.stringify({ submissionId, reason }),
            })
            const data = await response.json()
            if (data.success) {
              show('已拒绝该投稿', { type: 'success' })
              fetchSubmissions()
            } else {
              show(data.error || '操作失败', { type: 'error' })
            }
          } catch (error) {
            console.error('Error rejecting:', error)
            show('操作失败', { type: 'error' })
          }
        }}
      />
    </div>
  )
}
