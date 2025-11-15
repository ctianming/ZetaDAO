'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useMemo, useState, useEffect } from 'react'
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
      },
    },
  }))
  
  const [mounted, setMounted] = useState(false)
  
  // 确保配置在客户端正确初始化
  const config = useMemo(() => {
    console.log('[Providers] 初始化 Wagmi 配置')
    return getWagmiConfig()
  }, [])

  useEffect(() => {
    setMounted(true)
    console.log('[Providers] 组件已挂载')
  }, [])

  // 在服务端渲染时返回简化版本
  if (!mounted) {
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
