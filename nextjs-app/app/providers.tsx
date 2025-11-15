'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { getWagmiConfig } from '@/lib/wagmi-config'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 防止在生产环境中过度重试
        retry: 2,
        retryDelay: 1000,
        // 禁用服务器端查询
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  }))
  
  const [mounted, setMounted] = useState(false)
  // 立即初始化配置（包括服务器端），避免构建时错误
  const [config] = useState(() => getWagmiConfig())

  useEffect(() => {
    setMounted(true)
    console.log('[Providers] 组件已挂载')
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </RainbowKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
