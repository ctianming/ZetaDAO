import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('./providers').then(mod => ({ default: mod.Providers })), { ssr: false })

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZetaDAO Community Portal',
  description: 'ZetaChain以原生跨链I/O统一逻辑，直连BTC等多链，开发更简单、安全高效更省心。',
  keywords: ['ZetaChain', '跨链', '区块链', 'Web3', 'DeFi'],
  openGraph: {
    title: 'ZetaDAO社区门户 - 探索跨链创新',
    description: 'ZetaChain以原生跨链I/O统一逻辑，直连BTC等多链，开发更简单、安全高效更省心。',
    type: 'website',
    siteName: 'ZetaDAO社区门户',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
