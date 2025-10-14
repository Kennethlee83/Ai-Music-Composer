'use client'

import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const { chains, publicClient } = configureChains(
  [hardhat],
  [publicProvider()]
)

// Create a minimal config without any connectors
const config = createConfig({
  autoConnect: false,
  connectors: [],
  publicClient
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider 
        chains={chains} 
        modalSize="compact"
        initialChain={hardhat}
        showRecentTransactions={false}
        appInfo={{
          appName: 'WeAD Music Platform',
        }}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}


