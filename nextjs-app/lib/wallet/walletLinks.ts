export interface WalletLinkInfo {
  id: string
  name: string
  mobileDeepLink: string
  mobileUniversalLink: string
}

// Verify links with official registries for production use.
export const walletLinks: WalletLinkInfo[] = [
  { id: 'metamask', name: 'MetaMask', mobileDeepLink: 'metamask://wc?uri=', mobileUniversalLink: 'https://metamask.app.link/wc?uri=' },
  { id: 'trust', name: 'Trust Wallet', mobileDeepLink: 'trust://wc?uri=', mobileUniversalLink: 'https://link.trustwallet.com/wc?uri=' },
  { id: 'rainbow', name: 'Rainbow', mobileDeepLink: 'rainbow://wc?uri=', mobileUniversalLink: 'https://rnbwapp.com/wc?uri=' },
  { id: 'zerion', name: 'Zerion', mobileDeepLink: 'zerion://wc?uri=', mobileUniversalLink: 'https://wallet.zerion.io/wc?uri=' },
  { id: 'okx', name: 'OKX', mobileDeepLink: 'okx://wc?uri=', mobileUniversalLink: 'okx://wc?uri=' },
]
