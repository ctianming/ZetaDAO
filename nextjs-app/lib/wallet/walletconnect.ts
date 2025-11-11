// Lightweight WalletConnect v2 helper for deep-link pairing and QR fallback
// This module avoids SSR pitfalls by dynamically importing sign-client only in the browser.

import { getZetaChainConfig } from '@/lib/web3'

type SignClientType = any

let _clientPromise: Promise<SignClientType> | null = null

function getProjectId(): string | undefined {
  // Prefer public env for client-side use
  return process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.WALLETCONNECT_PROJECT_ID
}

export function isMobileUA(userAgent?: string) {
  if (typeof window === 'undefined') return false
  const ua = userAgent || navigator.userAgent
  return /Android|iPhone|iPad|iPod/i.test(ua)
}

export async function getSignClient(): Promise<SignClientType> {
  if (typeof window === 'undefined') throw new Error('WalletConnect SignClient must be used in the browser')
  if (_clientPromise) return _clientPromise
  const projectId = getProjectId()
  if (!projectId || projectId === 'demo-project-id') {
    throw new Error('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for WalletConnect SignClient')
  }
  _clientPromise = (async () => {
    const mod = await import('@walletconnect/sign-client')
    const SignClient = mod.default || mod
    const client = await SignClient.init({
      projectId,
      metadata: {
        name: 'ZetaDAO Community Portal',
        description: 'Admin auth & signing via WalletConnect',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://zeta.dao',
        icons: ['https://walletconnect.com/walletconnect-logo.png'],
      },
    })
    return client
  })()
  return _clientPromise
}

export type CreatePairingResult = {
  uri: string
  approval: () => Promise<any>
}

/**
 * Create a WalletConnect pairing URI for the current EVM chain.
 * Consumer can either deep-link on mobile or show a QR on desktop.
 */
export async function createPairingUri(): Promise<CreatePairingResult> {
  const client = await getSignClient()
  const { CHAIN } = getZetaChainConfig()
  const requiredNamespaces = {
    eip155: {
      methods: [
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'eth_signTypedData_v4',
        'eth_sendTransaction',
      ],
      chains: [`eip155:${CHAIN.id}`],
      events: ['accountsChanged', 'chainChanged'] as const,
    },
  }
  const { uri, approval } = await client.connect({ requiredNamespaces })
  if (!uri) throw new Error('Failed to create WalletConnect pairing URI')
  return { uri, approval }
}

/**
 * Build a deep-link URL for popular wallets. Fallback to "wc:" scheme when possible.
 */
export function buildWalletDeepLink(wallet: 'metamask' | 'rainbow' | 'zerion' | 'trust' | 'okx' | 'imtoken', uri: string) {
  const enc = encodeURIComponent(uri)
  switch (wallet) {
    case 'metamask':
      // Universal link works on iOS/Android; the native scheme also works in many contexts
      return `https://metamask.app.link/wc?uri=${enc}`
    case 'rainbow':
      return `https://rnbwapp.com/wc?uri=${enc}`
    case 'zerion':
      return `https://wallet.zerion.io/wc?uri=${enc}`
    case 'trust':
      return `https://link.trustwallet.com/wc?uri=${enc}`
    case 'okx':
      return `okx://wc?uri=${enc}`
    case 'imtoken':
      return `imtokenv2://wc?uri=${enc}`
    default:
      return `wc:${uri}`
  }
}

/**
 * Try to open a wallet deep-link in the current tab (mobile) or a new tab.
 */
export function openDeepLink(url: string, target: '_self' | '_blank' = '_self') {
  if (typeof window === 'undefined') return
  try {
    window.open(url, target, 'noopener,noreferrer')
  } catch (e) {
    // no-op
  }
}

/**
 * Optional: Generate a QR data URL for the pairing URI to display on desktop.
 */
export async function generateQrDataUrl(uri: string): Promise<string> {
  const { toDataURL } = await import('qrcode') as typeof import('qrcode')
  return toDataURL(uri)
}
