"use client"

import { useCallback, useEffect, useState } from 'react'
import { useEnsureAdminSession } from '@/components/admin/useEnsureAdminSession'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'

// 强制动态渲染，避免构建时预渲染导致 QueryClient 错误
export const dynamic = 'force-dynamic'

interface Banner {
  id: string;
  content: string;
  link_url?: string | null;
  status: 'active' | 'inactive' | 'scheduled';
  start_at?: string | null;
  end_at?: string | null;
  created_at: string;
}

export default function AdminBannersPage() {
  const { isAdmin, loading: authLoading, error: authError, refresh: refreshAdmin } = useEnsureAdminSession()
  const { show } = useToast()

  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Banner>>({ content: '', status: 'inactive' })

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/banners');
      const data = await response.json();
      if (data.success) {
        setBanners(data.data || []);
      } else {
        show(data.error || '加载横幅失败', { type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      show('加载横幅异常', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (isAdmin) {
      fetchBanners();
    }
  }, [isAdmin, fetchBanners]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ content: '', status: 'inactive', link_url: '', start_at: '', end_at: '' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content) {
      show('内容不能为空', { type: 'error' });
      return;
    }

    const url = form.id ? `/api/admin/banners/${form.id}` : '/api/admin/banners';
    const method = form.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        show(`横幅已${form.id ? '更新' : '创建'}`, { type: 'success' });
        resetForm();
        fetchBanners();
      } else {
        show(data.error || '操作失败', { type: 'error' });
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      show('操作异常', { type: 'error' });
    }
  };

  const handleEdit = (banner: Banner) => {
    setForm({
      ...banner,
      start_at: banner.start_at ? new Date(banner.start_at).toISOString().substring(0, 16) : '',
      end_at: banner.end_at ? new Date(banner.end_at).toISOString().substring(0, 16) : '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这个横幅吗？')) return;

    try {
      const response = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        show('横幅已删除', { type: 'success' });
        fetchBanners();
      } else {
        show(data.error || '删除失败', { type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      show('删除异常', { type: 'error' });
    }
  };

  if (authLoading) return <p>正在加载...</p>;
  if (!isAdmin) return <p>无权访问。</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">横幅通知管理</h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg mb-8 space-y-4">
            <h2 className="text-xl font-semibold">{form.id ? '编辑横幅' : '创建新横幅'}</h2>
            <textarea name="content" value={form.content} onChange={handleInputChange} placeholder="通知内容 (支持 Markdown)" className="w-full p-2 border rounded-lg" required />
            <input type="url" name="link_url" value={form.link_url || ''} onChange={handleInputChange} placeholder="跳转链接 (可选)" className="w-full p-2 border rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select name="status" value={form.status} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">
                <option value="inactive">禁用</option>
                <option value="active">激活</option>
                <option value="scheduled">计划中</option>
              </select>
              <input type="datetime-local" name="start_at" value={form.start_at || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" />
              <input type="datetime-local" name="end_at" value={form.end_at || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary-500 text-white rounded-lg">{form.id ? '更新' : '创建'}</button>
              {form.id && <button type="button" onClick={resetForm} className="px-6 py-2 border rounded-lg">取消编辑</button>}
            </div>
          </form>

          {/* List */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">横幅列表</h2>
            {loading ? <p>加载中...</p> : (
              <div className="space-y-4">
                {banners.map(banner => (
                  <div key={banner.id} className="p-4 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{banner.content}</p>
                      <p className="text-sm text-gray-500">状态: {banner.status} | 创建于: {formatDate(banner.created_at)}</p>
                      {banner.start_at && <p className="text-sm text-gray-500">开始: {formatDate(banner.start_at)}</p>}
                      {banner.end_at && <p className="text-sm text-gray-500">结束: {formatDate(banner.end_at)}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(banner)} className="px-3 py-1 text-sm border rounded-lg">编辑</button>
                      <button onClick={() => handleDelete(banner.id)} className="px-3 py-1 text-sm border rounded-lg text-red-600">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

