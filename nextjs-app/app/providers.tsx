'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect, type ReactNode } from 'react'
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

// Inner component that contains all the providers
function ProvidersInner({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    // Wagmi config must be created on the client side
    setConfig(getWagmiConfig());
  }, []);

  // Wait for config to be ready before rendering providers
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

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
  );
}

// Outer component that only renders on the client
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL FIX: Completely skip rendering during SSR to avoid hydration mismatches.
  // This ensures that all Web3-related providers and hooks are only initialized on the client.
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

  return <ProvidersInner>{children}</ProvidersInner>;
}
