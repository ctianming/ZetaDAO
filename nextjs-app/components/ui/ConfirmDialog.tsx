"use client"

import React, { useEffect } from 'react'

export type ConfirmDialogProps = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title = '确认操作', description, confirmText = '确认', cancelText = '取消', onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onCancel, onConfirm])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border p-6">
        <div className="text-lg font-semibold mb-2">{title}</div>
        {description && <div className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{description}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50">{cancelText}</button>
          <button onClick={onConfirm} className="px-3 py-2 text-sm rounded-md text-white bg-primary-600 hover:bg-primary-700">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
