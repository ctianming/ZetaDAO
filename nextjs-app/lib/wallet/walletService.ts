import { walletLinks } from './walletLinks'
import { getSignClient } from './walletconnect'
import { getZetaChainConfig } from '@/lib/web3'

const FALLBACK_TIMEOUT = 600 // ms

export interface ConnectResult { account: string; session: any }

let activeSession: any | null = null
let activeAccount: string | null = null
export function getActiveSession() { return activeSession }
export function getActiveAccount() { return activeAccount }

function isMobile() {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export async function connectWithWallet(walletId: string): Promise<ConnectResult> {
  if (typeof window === 'undefined') throw new Error('connectWithWallet must run in browser')
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  if (!projectId || projectId === 'demo-project-id') throw new Error('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')

  const info = walletLinks.find(w => w.id === walletId)
  if (!info) throw new Error(`Unsupported wallet: ${walletId}`)

  const client = await getSignClient()
  const { CHAIN } = getZetaChainConfig()
  const { uri, approval } = await client.connect({
    requiredNamespaces: { eip155: { methods: ['personal_sign', 'eth_signTypedData', 'eth_sendTransaction'], chains: [`eip155:${CHAIN.id}`], events: ['accountsChanged', 'chainChanged'] } },
  })
  if (!uri) throw new Error('No pairing URI returned')

  const encoded = encodeURIComponent(uri)
  if (isMobile()) {
    window.location.href = `${info.mobileDeepLink}${encoded}`
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.open(`${info.mobileUniversalLink}${encoded}`, '_blank', 'noopener,noreferrer')
      }
    }, FALLBACK_TIMEOUT)
  }
  const session = await approval()
  const accounts: string[] = session?.namespaces?.eip155?.accounts || []
  if (!accounts.length) throw new Error('No accounts in WalletConnect session')
  const account = accounts[0].split(':')[2]
  activeSession = session
  activeAccount = account
  return { account, session }
}

export async function personalSign(client: any, session: any, account: string, message: string): Promise<string> {
  const { CHAIN } = getZetaChainConfig()
  const sig = await client.request({ topic: session.topic, chainId: `eip155:${CHAIN.id}`, request: { method: 'personal_sign', params: [message, account] } })
  return sig as string
}

export async function connectAndSignMessage(walletId: string, message: string): Promise<{ account: string; signature: string; session: any }> {
  const { account, session } = await connectWithWallet(walletId)
  const client = await getSignClient()
  const signature = await personalSign(client, session, account, message)
  return { account, signature, session }
}
