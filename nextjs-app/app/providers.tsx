'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { getWagmiConfig } from '@/lib/wagmi-config'

// Wagmi and React Query require a singleton instance of the config and client.
// However, during server-side rendering (SSR), it's crucial to create a new instance 
// for each request to prevent data leakage between users. This setup ensures that.
const config = getWagmiConfig();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

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
