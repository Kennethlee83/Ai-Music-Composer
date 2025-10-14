'use client'

import { useState, useEffect, useRef } from 'react'
import { Wallet, AlertCircle } from 'lucide-react'

const CHAIN_CONFIG = {
  chainId: `0x${parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '56').toString(16)}`,
  chainName: process.env.NEXT_PUBLIC_NETWORK_NAME || 'BSC Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: [process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://bscscan.com']
}

export function SimpleWallet() {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true)
  const [balance, setBalance] = useState<string>('0')
  const accountRef = useRef<string | null>(null)
  const isDisconnectingRef = useRef<boolean>(false)

  const getMetaMaskProvider = () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    // If window.ethereum is MetaMask, use it directly
    if (window.ethereum.isMetaMask) {
      return window.ethereum
    }

    // If multiple providers exist, find MetaMask
    if (window.ethereum.providers?.length) {
      const metamask = window.ethereum.providers.find((p: any) => p.isMetaMask)
      if (metamask) {
        return metamask
      }
    }

    // Fallback to window.ethereum if MetaMask not found
    return window.ethereum
  }

  // Update ref whenever account changes
  useEffect(() => {
    accountRef.current = account
  }, [account])

  // Check fingerprint and grant credits to new users
  const checkFingerprint = async (address: string) => {
    try {
      // Wait for fingerprint to be generated
      let attempts = 0
      while (!window.userFingerprint && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!window.userFingerprint) {
        console.error('❌ Digital fingerprint not available')
        return
      }

      const fingerprint = window.userFingerprint
      console.log('🔍 Checking digital fingerprint...')

      const response = await fetch(`/api/fingerprint-credits?fingerprint=${fingerprint}&wallet=${address}`)
      const data = await response.json()

      if (data.success && data.isNewUser) {
        // NEW USER - Show welcome message
        console.log('🎉 NEW USER DETECTED!')
        alert(data.message || '🎉 Welcome! You received 1 FREE Off-Chain credit + 1 On-Chain credit!')
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('newUserWelcome', {
          detail: {
            fingerprint,
            offChainCredits: data.offChainCredits,
            onChainCreditsGranted: data.onChainCreditsGranted
          }
        }))
      } else {
        console.log('👋 Welcome back! Off-chain credits:', data.offChainCredits)
      }
    } catch (error) {
      console.error('Error checking fingerprint:', error)
    }
  }

  useEffect(() => {
    let pollInterval: NodeJS.Timeout
    
    checkConnection()
    
    // For mobile compatibility, directly use window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      // Use try-catch for mobile compatibility
      try {
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
      } catch (error) {
        console.log('Event listener setup error (mobile):', error)
      }

      // Polling backup for mobile devices (check every 2 seconds)
      pollInterval = setInterval(async () => {
        try {
          // Skip polling if user manually disconnected
          if (isDisconnectingRef.current) {
            return
          }
          
          const provider = getMetaMaskProvider()
          if (provider) {
            const currentAccounts = await provider.request({ method: 'eth_accounts' })
            if (currentAccounts.length > 0 && currentAccounts[0] !== accountRef.current) {
              // Account changed, trigger handler
              console.log('🔄 Mobile: Account change detected via polling')
              handleAccountsChanged(currentAccounts)
            } else if (currentAccounts.length === 0 && accountRef.current) {
              // Disconnected from MetaMask
              handleAccountsChanged([])
            }
          }
        } catch (error) {
          // Silently fail
        }
      }, 2000)
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        } catch (error) {
          console.log('Event listener cleanup error:', error)
        }
      }
    }
  }, [])

  const handleChainChanged = () => {
    window.location.reload()
  }

  const checkConnection = async () => {
    const provider = getMetaMaskProvider()
    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          accountRef.current = accounts[0] // Update ref
          await checkNetwork()
          await getBalance(accounts[0])
          await checkFingerprint(accounts[0]) // Check fingerprint and grant credits
        }
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }

  const handleAccountsChanged = async (accounts: string[]) => {
    // Prevent auto-reconnect if user manually disconnected
    if (isDisconnectingRef.current) {
      console.log('⏸️ Ignoring account change (user disconnected)')
      return
    }
    
    if (accounts.length === 0) {
      setAccount(null)
      setIsConnected(false)
      setBalance('0')
      accountRef.current = null
      // Dispatch disconnect event
      const disconnectEvent = new CustomEvent('walletDisconnected')
      window.dispatchEvent(disconnectEvent)
    } else {
      // Clear old balance first to prevent showing wrong data
      setBalance('0')
      setAccount(accounts[0])
      setIsConnected(true)
      accountRef.current = accounts[0] // Update ref for polling
      // Wait a bit for MetaMask to fully switch accounts
      await new Promise(resolve => setTimeout(resolve, 100))
      await getBalance(accounts[0])
      await checkFingerprint(accounts[0]) // Check fingerprint for new account
      // Dispatch connect event with new account
      const connectEvent = new CustomEvent('walletConnected', { detail: { address: accounts[0] } })
      window.dispatchEvent(connectEvent)
    }
  }

  const checkNetwork = async () => {
    const provider = getMetaMaskProvider()
    if (!provider) return
    
    try {
      const chainId = await provider.request({ method: 'eth_chainId' })
      setIsCorrectNetwork(chainId === CHAIN_CONFIG.chainId)
    } catch (error) {
      console.error('Error checking network:', error)
    }
  }

  const getBalance = async (address: string) => {
    const provider = getMetaMaskProvider()
    if (!provider) return
    
    try {
      const balanceHex = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      const balanceBnb = (parseInt(balanceHex, 16) / 1e18).toFixed(6)
      setBalance(balanceBnb)
    } catch (error) {
      console.error('Error getting balance:', error)
    }
  }

  const switchToBSCNetwork = async () => {
    const provider = getMetaMaskProvider()
    if (!provider) {
      alert('Please install MetaMask!')
      return
    }
    
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_CONFIG.chainId }],
      })
      setIsCorrectNetwork(true)
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [CHAIN_CONFIG],
          })
          setIsCorrectNetwork(true)
        } catch (addError) {
          console.error('Error adding network:', addError)
          alert('Failed to add BSC Mainnet network to MetaMask')
        }
      } else {
        console.error('Error switching network:', error)
        alert('Failed to switch to BSC Mainnet network')
      }
    }
  }

  const connectWallet = async () => {
    const provider = getMetaMaskProvider()
    
    if (!provider) {
      alert('Please install MetaMask! Visit https://metamask.io')
      return
    }

    try {
      // Clear disconnecting flag when manually connecting
      isDisconnectingRef.current = false
      
      console.log('Connecting to wallet...', provider.isMetaMask ? 'MetaMask detected' : 'Using default provider')
      
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      })
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
        accountRef.current = accounts[0] // Update ref for polling
        await checkNetwork()
        await getBalance(accounts[0])
        console.log('✅ Wallet connected:', accounts[0])
        
        // Dispatch custom event to notify all components
        const event = new CustomEvent('walletConnected', { detail: { address: accounts[0] } })
        window.dispatchEvent(event)
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      
      if (error.code === 4001) {
        alert('Connection cancelled. Please try again.')
      } else if (error.code === -32002) {
        alert('Connection request already pending. Please check MetaMask.')
      } else {
        alert('Failed to connect wallet. Please make sure MetaMask is unlocked and try again.')
      }
    }
  }

  const disconnectWallet = async () => {
    try {
      // Set flag to prevent auto-reconnect
      isDisconnectingRef.current = true
      
      // Clear local state
      setAccount(null)
      setIsConnected(false)
      setBalance('0')
      accountRef.current = null // Clear the ref to stop polling detection
      
      // Create and dispatch a custom event to notify all components
      const event = new CustomEvent('walletDisconnected')
      window.dispatchEvent(event)
      
      console.log('✅ Wallet disconnected (local state cleared)')
      
      // Keep the flag set longer to prevent aggressive reconnection
      setTimeout(() => {
        isDisconnectingRef.current = false
        console.log('🔓 Manual reconnect allowed again')
      }, 5000) // Increased from 2s to 5s for better stability
    } catch (error) {
      console.error('Error during disconnect:', error)
      isDisconnectingRef.current = false
    }
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2 md:space-x-3">
        {!isCorrectNetwork && (
          <div className="flex items-center space-x-2 bg-orange-900 bg-opacity-50 border border-orange-500 px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <button
              onClick={switchToBSCNetwork}
              className="text-sm text-orange-500 hover:text-orange-400 transition-colors font-semibold"
            >
              Switch to {CHAIN_CONFIG.chainName}
            </button>
          </div>
        )}
        
        {/* Balance Box - Show shortened address */}
        <div className="flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-gray-900 to-black border-2 border-gray-800 px-2 md:px-4 py-1.5 md:py-2 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[0.6rem] md:text-xs text-gray-400 text-quantum">Balance</span>
            <span className="text-[0.7rem] md:text-sm text-orange-500 font-bold">{balance} BNB</span>
          </div>
          <div className="h-6 md:h-8 w-px bg-gray-700"></div>
          {/* Mobile: First 6 chars, Desktop: Full shortened address */}
          <span className="text-[0.7rem] md:text-sm text-quantum text-gray-300 font-mono">
            <span className="md:hidden">{account.slice(0, 6)}</span>
            <span className="hidden md:inline">{account.slice(0, 6)}...{account.slice(-4)}</span>
          </span>
        </div>
        
        {/* Disconnect Button - Square on mobile, 30% smaller on desktop */}
        <button
          onClick={disconnectWallet}
          className="flex items-center justify-center bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white border-2 border-red-500 rounded-lg transition-all w-10 h-10 md:w-auto md:h-auto md:px-2.5 md:py-1.5 md:space-x-1.5"
          title="Disconnect Wallet"
        >
          {/* Mobile: Just "D" in square */}
          <span className="md:hidden font-bold text-sm">
            D
          </span>
          {/* Desktop: Icon + Text - 30% smaller */}
          <span className="hidden md:flex items-center space-x-1.5">
            <span className="text-sm">🔓</span>
            <span className="text-xs font-bold text-quantum">Disconnect</span>
          </span>
        </button>

      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 md:space-x-3">
      {/* Connect Wallet Button */}
      <button
        onClick={connectWallet}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-2 border-orange-500 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        <Wallet className="h-4 w-4 text-white" />
        <span className="text-white font-semibold text-xs">CONNECT WALLET</span>
      </button>
    </div>
  )
}
