'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useUserStore } from '@/stores/userStore'

/**
 * SessionSyncProvider 组件
 * 
 * 这是一个客户端组件，其唯一职责是监听 next-auth 的会话状态，
 * 并将其同步到全局的 userStore (Zustand) 中。
 * 
 * 这确保了整个应用的任何组件都可以从一个统一的、响应式的数据源 (useUserStore)
 * 获取最新的用户会话信息，解决了跨组件状态同步的问题。
 */
export function SessionSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const setSession = useUserStore((state) => state.setSession)

  useEffect(() => {
    // 当会话数据 (session) 或加载状态 (status) 发生变化时，
    // 调用 userStore 中的 setSession action 来更新全局状态。
    // 无论用户是登录、登出还是会话更新，这里都会捕捉到变化。
    setSession(session)
  }, [session, status, setSession])

  // 这个组件不渲染任何 UI，只是一个逻辑包装器。
  return <>{children}</>
}



