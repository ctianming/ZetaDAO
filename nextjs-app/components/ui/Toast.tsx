'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastItem = {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

type ToastContextValue = {
  show: (message: string, opts?: { type?: ToastItem['type']; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let idSeed = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<ToastItem[]>([])
  const show = useCallback((message: string, opts?: { type?: ToastItem['type']; duration?: number }) => {
    const item: ToastItem = { id: idSeed++, message, type: opts?.type || 'info', duration: opts?.duration ?? 2500 }
    setList((l) => [...l, item])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== item.id)), item.duration)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[9999] flex flex-col items-center gap-2 px-3">
        {list.map((t) => (
          <div
            key={t.id}
            className={
              'min-w-[200px] max-w-[90vw] rounded-lg px-3 py-2 text-sm shadow-lg border animate-in fade-in slide-in-from-bottom-2 ' +
              (t.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : t.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-800 border-gray-200')
            }
            role="status"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
