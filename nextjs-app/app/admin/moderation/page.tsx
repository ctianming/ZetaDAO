"use client"

import { useAccount } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'
import Header from '@/components/layout/Header'
import { Submission } from '@/types'
import { formatDate, truncateAddress } from '@/lib/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PromptDialog from '@/components/ui/PromptDialog'
import { useToast } from '@/components/ui/Toast'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// 强制动态渲染，避免构建时预渲染导致 QueryClient 错误
export const dynamic = 'force-dynamic'

export default function AdminModerationPage() {
  const { address, isConnected, status } = useAccount()
  const { isAdmin, loading: authLoading, error: authError, refresh: refreshAdmin } = useEnsureAdminSession()
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
  const [previewingSubmission, setPreviewingSubmission] = useState<Submission | null>(null)

  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/submissions?status=${filter}`, { cache: 'no-store' })
      const data = await response.json()
      if (data.success) setSubmissions(data.data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally { setLoading(false) }
  }, [filter])

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true)
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const json = await res.json()
      if (json?.data) setCatList(json.data)
    } catch (error) {
      console.error('Error fetching categories', error)
    } finally { setCatLoading(false) }
  }, [])

  useEffect(() => {
    const checkAndFetch = async () => {
      if (!mounted) return
      if (!isAdmin) return
      fetchSubmissions()
      fetchCategories()
    }
    checkAndFetch()
  }, [mounted, isAdmin, fetchSubmissions, fetchCategories])

  const saveCategory = async () => {
    try {
      const method = catForm.id ? 'PUT' : 'POST'
      const res = await fetch('/api/categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) })
      const json = await res.json()
      if (json.success) { setCatForm({ slug: '', name: '' }); fetchCategories() }
      else { show(json.error || '保存失败', { type: 'error' }) }
    } catch (error) { console.error('save category failed', error); show('保存失败', { type: 'error' }) }
  }

  const editCategory = (c: { id: string; slug: string; name: string; description?: string }) => {
    setCatForm({ id: c.id, slug: c.slug, name: c.name, description: c.description })
  }

  const deleteCategory = (c: { id: string; slug: string; name?: string }) => setConfirmDeleteCat(c)

  const handleApprove = (submissionId: string) => setConfirmApproveId(submissionId)
  const handleReject = (submissionId: string) => setPromptReject({ open: true, id: submissionId })

  if (!mounted) return null

  if (!isConnected || !address || status !== 'connected') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-center text-sm text-muted-foreground">{status === 'disconnected' ? '请先连接管理员钱包后再访问后台。' : '正在检查管理员权限，请稍候...'}</p>
        </main>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-center text-sm text-muted-foreground">正在进行管理员签名认证...</p>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-4">管理员访问指引</h1>
            <ol className="space-y-3 text-sm list-decimal list-inside mb-4">
              <li>确保 <code>ADMIN_WALLETS</code> 已配置。</li>
              <li>连接管理员钱包后自动发起签名挑战。</li>
              <li>签名仅用于身份验证，不涉及资金与授权。</li>
            </ol>
            {authError && <div className="text-xs text-red-600 mb-3">{authError}</div>}
            <div className="flex gap-3">
              <button onClick={() => refreshAdmin()} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">重新认证</button>
              <button onClick={() => location.reload()} className="px-4 py-2 rounded-lg border text-sm">刷新页面</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">投稿审核与分类管理</h1>

          {/* 分类管理 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">分类管理</h2>
            </div>
            {/* 表单 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input placeholder="slug（唯一标识，例如 jichu）" className="border rounded-lg px-3 py-2" value={catForm.slug} onChange={(e) => setCatForm((s) => ({ ...s, slug: e.target.value }))} />
              <input placeholder="名称（例如 基础）" className="border rounded-lg px-3 py-2" value={catForm.name} onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))} />
              <input placeholder="描述（可选）" className="border rounded-lg px-3 py-2" value={catForm.description || ''} onChange={(e) => setCatForm((s) => ({ ...s, description: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={saveCategory} className="px-4 py-2 bg-primary-500 text-white rounded-lg">{catForm.id ? '更新' : '创建'}</button>
                {catForm.id && (<button onClick={() => setCatForm({ slug: '', name: '' })} className="px-4 py-2 border rounded-lg">取消</button>)}
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

          {/* 投稿审核 */}
          <div className="flex gap-4 mb-8">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-6 py-2 rounded-full font-medium transition-colors ${filter === s ? 'bg-primary-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                {s === 'pending' && '待审核'}
                {s === 'approved' && '已批准'}
                {s === 'rejected' && '已拒绝'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20"><p className="text-muted-foreground">加载中...</p></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl"><p className="text-muted-foreground text-lg">暂无投稿</p></div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold mb-2">{submission.title}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>类别：{submission.category}</span>
                        <span>•</span>
                        <span>投稿者：{truncateAddress(submission.walletAddress)}</span>
                        <span>•</span>
                        <span>{formatDate(submission.submittedAt)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : submission.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {submission.status === 'pending' && '待审核'}
                      {submission.status === 'approved' && '已批准'}
                      {submission.status === 'rejected' && '已拒绝'}
                    </span>
                  </div>
                  <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: submission.content.substring(0, 300) + '...' }} />
                  {submission.metadata?.tags && submission.metadata.tags.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {submission.metadata.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                  {submission.category === 'article' && submission.metadata?.articleCategory && (
                    <div className="mb-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">分类：{submission.metadata.articleCategory}</span></div>
                  )}
                  {submission.status === 'pending' && (
                    <div className="flex gap-4 border-t border-gray-200 pt-4">
                      <button onClick={() => handleApprove(submission.id)} className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors">✓ 批准</button>
                      <button onClick={() => handleReject(submission.id)} className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">✗ 拒绝</button>
                      <button onClick={() => setPreviewingSubmission(submission)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors">预览</button>
                    </div>
                  )}
                  {submission.status === 'approved' && submission.reviewedBy && (
                    <div className="text-sm text-muted-foreground border-t border-gray-200 pt-4">审核者：{truncateAddress(submission.reviewedBy)} • {submission.reviewedAt && formatDate(submission.reviewedAt)}</div>
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
            const res = await fetch(url, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (res.ok) { show('已删除分类', { type: 'success' }); fetchCategories() }
            else { show(json.error || '删除失败', { type: 'error' }) }
          } catch (error) {
            console.error('delete category failed', error)
            show('删除失败', { type: 'error' })
          } finally { setConfirmDeleteCat(null) }
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
            const response = await fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: confirmApproveId }) })
            const data = await response.json()
            if (data.success) { show('审核通过！内容已发布', { type: 'success' }); fetchSubmissions() }
            else { show(data.error || '操作失败', { type: 'error' }) }
          } catch (error) { console.error('Error approving:', error); show('操作失败', { type: 'error' }) }
          finally { setConfirmApproveId(null) }
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
            const response = await fetch('/api/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, reason }) })
            const data = await response.json()
            if (data.success) { show('已拒绝该投稿', { type: 'success' }); fetchSubmissions() }
            else { show(data.error || '操作失败', { type: 'error' }) }
          } catch (error) { console.error('Error rejecting:', error); show('操作失败', { type: 'error' }) }
        }}
      />

      {previewingSubmission && (
        <PreviewModal 
          submission={previewingSubmission} 
          onClose={() => setPreviewingSubmission(null)} 
        />
      )}
    </div>
  )
}

function PreviewModal({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const [renderedContent, setRenderedContent] = useState('<p>加载中...</p>')

  useEffect(() => {
    const render = async () => {
      try {
        const rawHtml = await marked(submission.content)
        const cleanHtml = sanitizeHtml(rawHtml, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'title', 'width', 'height'],
            a: ['href', 'title', 'target', 'rel']
          }
        })
        setRenderedContent(cleanHtml)
      } catch (error) {
        console.error('Error rendering markdown:', error)
        setRenderedContent('<p>预览渲染失败</p>')
      }
    }
    render()
  }, [submission.content])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">{submission.title}</h2>
            <div className="flex gap-3 text-sm text-gray-600 mt-1">
              <span>类别：{submission.category}</span>
              <span>•</span>
              <span>投稿者：{truncateAddress(submission.walletAddress)}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
