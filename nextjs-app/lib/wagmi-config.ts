/**
 * Wagmi 配置模块
 * 集中管理 Web3 钱包连接和链配置
 */

import { createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { getZetaChainConfig } from '@/lib/web3'
import { web3, app } from '@/lib/env'

/**
 * 获取 Wagmi 配置
 * 根据环境（服务端/客户端）和配置返回适当的连接器
 */
export function getWagmiConfig() {
  const { CHAIN, RPC_URL } = getZetaChainConfig()
  const projectId = web3.walletConnectProjectId

  // 服务端渲染阶段：使用轻量配置，避免远程请求
  // 使用空的连接器数组以确保与 RainbowKit 兼容
  if (typeof window === 'undefined') {
    return createConfig({
      chains: [CHAIN],
      transports: { [CHAIN.id]: http(RPC_URL) },
      connectors: [],
    })
  }

  // 浏览器环境：完整配置
  // 仅启用 MetaMask + WalletConnect，显式排除 Coinbase
  // 避免其 SDK 及分析上报（cca-lite）带来的报错与干扰
  if (projectId && projectId !== 'demo-project-id') {
    const rkConnectors = connectorsForWallets(
      [
        {
          groupName: '推荐',
          wallets: [
            // 仅保留 MetaMask 与 WalletConnect
            // 避免某些注入钱包拦截导致的未授权报错
            metaMaskWallet,
            walletConnectWallet,
          ],
        },
      ],
      {
        appName: app.name,
        projectId,
      }
    )
    return createConfig({
      chains: [CHAIN],
      transports: { [CHAIN.id]: http(RPC_URL) },
      connectors: rkConnectors,
    })
  }

  // 回退：仅使用浏览器注入钱包（不包含 Coinbase）
  console.warn('[WalletConnect] 缺少 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID，将回退到浏览器注入钱包（不包含 Coinbase）。')
  return createConfig({
    chains: [CHAIN],
    transports: { [CHAIN.id]: http(RPC_URL) },
    connectors: [
      metaMask({ dappMetadata: { name: app.name } }),
      injected({ target: 'metaMask' }),
    ],
  })
}

/**
 * 获取链配置信息（用于显示和工具函数）
 */
export function getChainInfo() {
  return getZetaChainConfig()
}

