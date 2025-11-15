'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { getWagmiConfig } from '@/lib/wagmi-config'

// This setup ensures that the QueryClient is created only once per request on the server
// and as a singleton on the client, preventing data leakage between users during SSR.
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
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  
  // State to hold the client-side Wagmi config and track mount status
  const [config, setConfig] = useState<Config | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wagmi config must be created on the client side to ensure access to window object.
    setConfig(getWagmiConfig());
    setMounted(true);
  }, []);

  // CRITICAL FIX: Do not render children until the component is mounted on the client
  // and the Wagmi config is ready. This prevents hydration mismatches and ensures that
  // all child components (like Header) can safely use wagmi and RainbowKit hooks.
  if (!mounted || !config) {
    return null;
  }

  // Once mounted on the client, render the full provider tree with children.
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
