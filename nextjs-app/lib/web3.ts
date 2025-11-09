import { Chain } from 'viem'
import { zetachain, zetachainAthensTestnet } from 'wagmi/chains'

/**
 * Centralized ZetaChain network configuration.
 * Defaults to Athens Testnet (7001) if not configured.
 */
export function getZetaChainConfig() {
  const envChainId = Number(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001')
  const chain: Chain = envChainId === 7000 ? (zetachain as unknown as Chain) : (zetachainAthensTestnet as unknown as Chain)
  const rpcUrl = process.env.NEXT_PUBLIC_ZETA_RPC_URL || chain.rpcUrls?.default?.http?.[0] || ''
  const explorerBase = (process.env.NEXT_PUBLIC_ZETA_EXPLORER_BASE || chain.blockExplorers?.default?.url || '').replace(/\/$/, '')
  return {
    CHAIN_ID: chain.id,
    CHAIN: chain,
    RPC_URL: rpcUrl,
    EXPLORER_BASE: explorerBase,
  }
}
