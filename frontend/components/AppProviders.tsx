"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";

import { createWagmiConfig } from "@/lib/wagmiConfig";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof createWagmiConfig> | null>(null);

  useEffect(() => {
    setWagmiConfig(createWagmiConfig());
  }, []);

  if (!wagmiConfig) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
