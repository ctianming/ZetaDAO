'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { zetachainAthensTestnet } from 'wagmi/chains'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const config = projectId && projectId !== 'demo-project-id'
  ? getDefaultConfig({
      appName: 'ZetaDAO Community Portal',
      projectId,
      chains: [zetachainAthensTestnet],
      transports: { [zetachainAthensTestnet.id]: http() },
    })
  : (() => {
      if (typeof window !== 'undefined') {
        console.warn('[WalletConnect] 缺少 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID，将回退到浏览器注入钱包。')
      }
      return createConfig({
        chains: [zetachainAthensTestnet],
        transports: { [zetachainAthensTestnet.id]: http() },
        connectors: [
          injected(),
          // 可选：在无 projectId 时也允许 MetaMask 直连
          metaMask({ dappMetadata: { name: 'ZetaDAO Community Portal' } }),
        ],
      })
    })()

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
