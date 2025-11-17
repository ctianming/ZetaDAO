/**
 * 全局管理员认证状态 Store
 * 
 * 使用 Zustand 管理管理员的认证状态，确保状态在整个应用中共享，
 * 避免每次页面导航时都重新检查认证状态。
 */

import { create } from 'zustand'

interface AdminState {
  // 认证状态
  isAdmin: boolean
  loading: boolean
  error: string | null
  address?: string
  needsConnection: boolean
  
  // 会话检查状态
  sessionChecked: boolean // 标记是否已经检查过服务器 session
  initialCheckDone: boolean // 标记是否完成了首次检查（用于区分"正在检查"和"检查完成但未认证"）
  
  // Actions
  setIsAdmin: (isAdmin: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAddress: (address?: string) => void
  setNeedsConnection: (needs: boolean) => void
  setSessionChecked: (checked: boolean) => void
  setInitialCheckDone: (done: boolean) => void
  
  // 重置状态（用于登出）
  reset: () => void
}

const initialState = {
  isAdmin: false,
  loading: true, // 初始状态设为 loading，避免闪现"无权限"
  error: null,
  address: undefined,
  needsConnection: false,
  sessionChecked: false,
  initialCheckDone: false,
}

export const useAdminStore = create<AdminState>((set) => ({
  ...initialState,
  
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAddress: (address) => set({ address }),
  setNeedsConnection: (needsConnection) => set({ needsConnection }),
  setSessionChecked: (sessionChecked) => set({ sessionChecked }),
  setInitialCheckDone: (initialCheckDone) => set({ initialCheckDone }),
  
  reset: () => set(initialState),
}))

