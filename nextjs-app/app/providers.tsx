'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { zetachainAthensTestnet } from 'wagmi/chains'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useMemo, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const config = useMemo(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    // 在服务端渲染阶段避免远程请求 web3modal 配置，采用本地轻量配置
    if (typeof window === 'undefined') {
      return createConfig({
        chains: [zetachainAthensTestnet],
        transports: { [zetachainAthensTestnet.id]: http() },
        connectors: [
          injected(),
          metaMask({ dappMetadata: { name: 'ZetaDAO Community Portal' } }),
        ],
      })
    }
    // 浏览器环境下，如果提供了 projectId，使用带 WalletConnect 的默认配置
    if (projectId && projectId !== 'demo-project-id') {
      return getDefaultConfig({
        appName: 'ZetaDAO Community Portal',
        projectId,
        chains: [zetachainAthensTestnet],
        transports: { [zetachainAthensTestnet.id]: http() },
      })
    }
    // 否则回退到注入钱包
    console.warn('[WalletConnect] 缺少 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID，将回退到浏览器注入钱包。')
    return createConfig({
      chains: [zetachainAthensTestnet],
      transports: { [zetachainAthensTestnet.id]: http() },
      connectors: [
        injected(),
        metaMask({ dappMetadata: { name: 'ZetaDAO Community Portal' } }),
      ],
    })
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
