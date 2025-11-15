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
  const [config, setConfig] = useState<ReturnType<typeof getWagmiConfig> | null>(null)

  useEffect(() => {
    // 只在客户端初始化 Wagmi 配置
    if (typeof window !== 'undefined') {
      console.log('[Providers] 初始化 Wagmi 配置')
      setConfig(getWagmiConfig())
      setMounted(true)
      console.log('[Providers] 组件已挂载')
    }
  }, [])

  // 在服务端渲染或配置未加载时返回简化版本
  if (!mounted || !config) {
    return (
      <SessionProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </SessionProvider>
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
