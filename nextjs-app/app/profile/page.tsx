'use client'

import Header from '@/components/layout/Header'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [identities, setIdentities] = useState<any[]>([])
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const walletAddress = (session as any)?.walletAddress as string | undefined
  const uid = (session as any)?.uid as string | undefined

  useEffect(() => {
    const load = async () => {
      if (!uid) return
      const res = await fetch(`/api/user?uid=${uid}`, { cache: 'no-store' })
      const j = await res.json()
      if (j?.data?.user?.username) setUsername(j.data.user.username)
      if (j?.data?.user?.avatar_url) setAvatarUrl(j.data.user.avatar_url)
      if (j?.data?.user?.bio) setBio(j.data.user.bio)
      if (j?.data?.identities) setIdentities(j.data.identities)
    }
    load()
  }, [uid])

  const save = async () => {
    if (!uid) return
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, username, avatar_url: avatarUrl, bio }),
      })
      const j = await res.json()
      if (!j.success) alert(j.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const unbind = async (provider: string) => {
    if (!confirm(`确定解绑 ${provider} ?`)) return
    const res = await fetch(`/api/auth/identity?provider=${provider}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) alert(j.error || '解绑失败')
    else {
      setIdentities(ids => ids.filter(i => i.provider !== provider))
    }
  }

  const changePassword = async () => {
    setPwdMsg('')
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew })
    })
    const j = await res.json()
    if (!j.success) setPwdMsg(j.error || '修改失败')
    else setPwdMsg('密码修改成功')
  }

  async function compressImage(file: File, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<File> {
    try {
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      await new Promise((res, rej) => {
        img.onload = () => res(null)
        img.onerror = rej
        img.src = url
      })
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const type = file.type === 'image/png' ? 'image/webp' : file.type
      const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b!), type, quality))
      URL.revokeObjectURL(url)
      return new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.webp'), { type })
    } catch {
      return file
    }
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      // client-side compress to reduce bandwidth
      file = await compressImage(file, 512, 512, 0.85)
      const form = new FormData()
      form.append('file', file)
      form.append('filename', file.name)
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const j = await res.json()
      if (!j.success) return alert(j.error || '上传失败')
      setAvatarUrl(j.url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">个人资料</h1>
          <div className="space-y-8 bg-white p-6 rounded-2xl shadow">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {avatarUrl ? <Image src={avatarUrl} alt="avatar" width={80} height={80} className="object-cover w-full h-full" /> : <span className="text-xs text-gray-400">无头像</span>}
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-sm mb-1">头像 URL</label>
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="https://..." value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} />
                <div className="flex items-center gap-2">
                  <label className="text-sm px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="file" accept="image/*" className="hidden" onChange={e=>{
                      const f = e.target.files?.[0]; if (f) onUpload(f)
                    }} />
                    {uploading ? '上传中...' : '选择图片上传'}
                  </label>
                  <span className="text-xs text-gray-500">支持 JPG/PNG/WebP，建议 ≤ 1MB</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-1">UID</label>
                <div className="px-3 py-2 border rounded-lg bg-gray-50 break-all text-xs">{uid || '未登录'}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">钱包地址</label>
                <div className="px-3 py-2 border rounded-lg bg-gray-50 break-all text-xs">{walletAddress || '未绑定'}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">用户名</label>
              <input className="border rounded-lg px-3 py-2 w-full" value={username} onChange={e=>setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">个人简介</label>
              <textarea className="border rounded-lg px-3 py-2 w-full" rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="介绍一下你自己" />
            </div>
            <div>
              <label className="block text-sm mb-2">已绑定身份</label>
              <div className="space-y-2">
                {identities.length === 0 && <div className="text-xs text-gray-500">暂无绑定</div>}
                {identities.map(id => (
                  <div key={id.provider} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium mr-2">{id.provider}</span>
                      <span className="text-gray-600 break-all">{id.account_id}</span>
                    </div>
                    <button onClick={()=>unbind(id.provider)} className="text-red-600 text-xs hover:underline">解绑</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">（绑定操作通过对应登录方式完成。GitHub 登录后会自动绑定）</div>
            </div>
            <div>
              <label className="block text-sm mb-2">修改密码</label>
              <div className="space-y-2">
                <input className="border rounded-lg px-3 py-2 w-full" type="password" placeholder="当前密码" value={pwdCurrent} onChange={e=>setPwdCurrent(e.target.value)} />
                <input className="border rounded-lg px-3 py-2 w-full" type="password" placeholder="新密码（≥8位）" value={pwdNew} onChange={e=>setPwdNew(e.target.value)} />
                <button onClick={changePassword} disabled={!pwdCurrent || !pwdNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">提交修改</button>
                {pwdMsg && <div className="text-xs mt-1 text-gray-600">{pwdMsg}</div>}
              </div>
            </div>
            <div>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg">{saving ? '保存中...' : '保存所有更改'}</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
