'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'
import { useMemo, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { getZetaChainConfig } from '@/lib/web3'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const config = useMemo(() => {
    const { CHAIN, RPC_URL } = getZetaChainConfig()
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    // 在浏览器端尽可能选择 MetaMask 作为首选 provider，避免聚合层/其他钱包接管
    if (typeof window !== 'undefined') {
      try {
        const w = window as any
        const eth = w.ethereum
        if (eth?.providers?.length) {
          const metaMaskProvider = eth.providers.find((p: any) => p && p.isMetaMask)
          if (metaMaskProvider) {
            w.ethereum = metaMaskProvider
          }
        }
      } catch {}
    }
    // 在服务端渲染阶段避免远程请求 web3modal 配置，采用本地轻量配置
    if (typeof window === 'undefined') {
      return createConfig({
        chains: [CHAIN],
        transports: { [CHAIN.id]: http(RPC_URL) },
        connectors: [
          // 优先 MetaMask，避免在多钱包注入时选择到非预期提供者
          metaMask({ dappMetadata: { name: 'ZetaDAO Community Portal' } }),
          injected({ target: 'metaMask' }),
        ],
      })
    }
    // 浏览器环境：仅启用 MetaMask + WalletConnect，显式排除 Coinbase，以避免其 SDK 及分析上报（cca-lite）带来的报错与干扰
    if (projectId && projectId !== 'demo-project-id') {
      const rkConnectors = connectorsForWallets(
        [
          {
            groupName: '推荐',
            wallets: [
              // 仅保留 MetaMask 与 WalletConnect，避免某些注入钱包拦截导致的未授权报错
              metaMaskWallet,
              walletConnectWallet,
            ],
          },
        ],
        {
          appName: 'ZetaDAO Community Portal',
          projectId,
        }
      )
      return createConfig({
        chains: [CHAIN],
        transports: { [CHAIN.id]: http(RPC_URL) },
        connectors: rkConnectors,
      })
    }
    // 否则回退到注入钱包（仅注入 + MetaMask）
    console.warn('[WalletConnect] 缺少 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID，将回退到浏览器注入钱包（不包含 Coinbase）。')
    return createConfig({
      chains: [CHAIN],
      transports: { [CHAIN.id]: http(RPC_URL) },
      connectors: [
  metaMask({ dappMetadata: { name: 'ZetaDAO Community Portal' } }),
        injected({ target: 'metaMask' }),
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
