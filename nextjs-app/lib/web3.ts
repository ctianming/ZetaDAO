import { Chain } from 'viem'
import { zetachain, zetachainAthensTestnet } from 'wagmi/chains'
import { web3 } from './env'

/**
 * Centralized ZetaChain network configuration.
 * Defaults to Athens Testnet (7001) if not configured.
 */
export function getZetaChainConfig() {
  const chain: Chain = web3.chainId === 7000 
    ? (zetachain as unknown as Chain) 
    : (zetachainAthensTestnet as unknown as Chain)
  
  const rpcUrl = web3.rpcUrl || chain.rpcUrls?.default?.http?.[0] || ''
  const explorerBase = web3.explorerBase || chain.blockExplorers?.default?.url || ''
  
  return {
    CHAIN_ID: chain.id,
    CHAIN: chain,
    RPC_URL: rpcUrl,
    EXPLORER_BASE: explorerBase,
  }
}
