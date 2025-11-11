"use client"
import { useCallback, useState } from 'react'
import { createPairingUri, buildWalletDeepLink, openDeepLink, generateQrDataUrl, isMobileUA } from '@/lib/wallet/walletconnect'

export interface DeepLinkState {
  uri: string | null
  qrDataUrl: string | null
  loading: boolean
  error: string | null
  opened: boolean
}

/**
 * Hook to create a WalletConnect pairing and attempt mobile deep-link open.
 * Falls back to QR generation on desktop.
 */
export function useWalletDeepLinkConnect(preferredWallet: 'metamask' | 'rainbow' | 'zerion' | 'trust' | 'okx' | 'imtoken' = 'metamask') {
  const [state, setState] = useState<DeepLinkState>({ uri: null, qrDataUrl: null, loading: false, error: null, opened: false })

  const start = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { uri } = await createPairingUri()
      let qr: string | null = null
      if (!isMobileUA()) {
        qr = await generateQrDataUrl(uri)
      } else {
        const link = buildWalletDeepLink(preferredWallet, uri)
        openDeepLink(link, '_self')
      }
      setState({ uri, qrDataUrl: qr, loading: false, error: null, opened: true })
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e?.message || 'WalletConnect 连接失败' }))
    }
  }, [preferredWallet])

  return { ...state, start }
}
