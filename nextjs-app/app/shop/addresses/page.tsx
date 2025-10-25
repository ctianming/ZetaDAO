"use client"

import Header from '@/components/layout/Header'
import { useEffect, useState } from 'react'
import { ShopAddress } from '@/types'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function AddressesPage() {
  const [list, setList] = useState<ShopAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<ShopAddress>>({ is_default: false })
  const { show } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shop/addresses', { cache: 'no-store' })
      const j = await res.json()
      if (j?.success) setList(j.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/shop/addresses', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!j.success) { show(j.error || '保存失败', { type: 'error' }); return }
      show('保存成功', { type: 'success' })
      setForm({ is_default: false })
      load()
    } catch (e: any) {
      show(e.message || '保存失败', { type: 'error' })
    }
  }

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const del = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/shop/addresses?id=${encodeURIComponent(deleteId)}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { show(j.error || '删除失败', { type: 'error' }); return }
    show('已删除', { type: 'success' })
    setDeleteId(null)
    load()
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">收货信息</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <div className="text-lg font-semibold mb-3">{form.id ? '编辑地址' : '新增地址'}</div>
              <div className="space-y-3">
                <input className="w-full border rounded-lg px-3 py-2" placeholder="收件人" value={form.contact_name||''} onChange={e=>setForm(s=>({...s, contact_name: e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="手机号" value={form.phone||''} onChange={e=>setForm(s=>({...s, phone: e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="地址（街道/门牌号等）" value={form.address_line1||''} onChange={e=>setForm(s=>({...s, address_line1: e.target.value}))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="补充地址（楼栋/单元等，选填）" value={form.address_line2||''} onChange={e=>setForm(s=>({...s, address_line2: e.target.value}))} />
                <div className="grid grid-cols-3 gap-3">
                  <input className="border rounded-lg px-3 py-2" placeholder="城市" value={form.city||''} onChange={e=>setForm(s=>({...s, city: e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2" placeholder="省/州" value={form.state||''} onChange={e=>setForm(s=>({...s, state: e.target.value}))} />
                  <input className="border rounded-lg px-3 py-2" placeholder="邮编" value={form.postal_code||''} onChange={e=>setForm(s=>({...s, postal_code: e.target.value}))} />
                </div>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="国家/地区" value={form.country||''} onChange={e=>setForm(s=>({...s, country: e.target.value}))} />
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_default} onChange={e=>setForm(s=>({...s, is_default: e.target.checked}))} /> 设为默认</label>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-primary-600 text-white" onClick={save}>保存</button>
                  {form.id && <button className="px-4 py-2 rounded-lg border" onClick={()=>setForm({ is_default: false })}>重置</button>}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <div className="text-lg font-semibold mb-3">我的地址</div>
              {loading ? <div className="text-sm text-gray-500">加载中...</div> : (
                <div className="space-y-3">
                  {list.length === 0 && <div className="text-sm text-gray-500">暂无地址</div>}
                  {list.map(a => (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="flex justify-between">
                        <div className="font-medium">{a.contact_name} {a.is_default && <span className="text-xs text-emerald-600">(默认)</span>}</div>
                        <div className="text-sm text-gray-600">{a.phone}</div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {a.address_line1} {a.address_line2} {a.city} {a.state} {a.postal_code} {a.country}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button className="px-3 py-1 rounded border" onClick={()=>setForm({ ...a })}>编辑</button>
                        <button className="px-3 py-1 rounded border text-red-600" onClick={()=>setDeleteId(a.id)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ConfirmDialog
        open={!!deleteId}
        title="删除地址"
        description="确定要删除该收货地址吗？此操作不可恢复。"
        confirmText="删除"
        onConfirm={del}
        onCancel={()=>setDeleteId(null)}
      />
    </div>
  )
}
