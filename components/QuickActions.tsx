'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink, Trophy, TrendingUp } from 'lucide-react'

interface LocalMusicFile {
  filename: string
  filepath: string
  title: string
  style: string
  lyrics?: string
  timestamp: number
  size: number
}

export function QuickActions() {
  const { t } = useTranslation()
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [musicFiles, setMusicFiles] = useState<LocalMusicFile[]>([])
  const [totalTracks, setTotalTracks] = useState(0)

  useEffect(() => {
    checkWallet()
    
    // Listen for account changes (including disconnection)
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        setUserAddress(null)
        setMusicFiles([])
        setTotalTracks(0)
      } else {
        // Account changed
        setUserAddress(accounts[0])
      }
    }
    
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
    
    // Listen for custom wallet disconnect event
    const handleWalletDisconnect = () => {
      setUserAddress(null)
      setMusicFiles([])
      setTotalTracks(0)
    }
    
    // Listen for custom wallet connect event
    const handleWalletConnect = (event: any) => {
      const address = event.detail?.address
      if (address) {
        setUserAddress(address)
      }
    }
    
    window.addEventListener('walletDisconnected', handleWalletDisconnect)
    window.addEventListener('walletConnected', handleWalletConnect)
    
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
      window.removeEventListener('walletDisconnected', handleWalletDisconnect)
      window.removeEventListener('walletConnected', handleWalletConnect)
    }
  }, [])

  useEffect(() => {
    if (userAddress) {
      // Reload music files when wallet connects
      loadMusicFiles()
    } else {
      // Clear data when no wallet
      setMusicFiles([])
      setTotalTracks(0)
    }
  }, [userAddress])

  const checkWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setUserAddress(accounts[0])
        }
      }
    } catch (error) {
      console.error('Error checking wallet:', error)
    }
  }

  const loadMusicFiles = async () => {
    if (!userAddress) return

    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/local-music?userAddress=${userAddress}&t=${timestamp}`)
      const data = await response.json()
      
      if (data.success) {
        const files = data.files as LocalMusicFile[]
        setMusicFiles(files)
        setTotalTracks(files.length)
      }
    } catch (error) {
      console.error('Error loading music files:', error)
    }
  }

  const downloadAllTracks = async () => {
    if (musicFiles.length === 0) {
      alert('No tracks to download')
      return
    }

    alert(`Downloading ${musicFiles.length} tracks... This may take a moment.`)
    
    for (const file of musicFiles) {
      const link = document.createElement('a')
      link.href = `/api/local-music?filename=${file.filename}&userAddress=${userAddress}`
      link.download = `${file.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Small delay between downloads to avoid overwhelming browser
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const viewOnBSCScan = () => {
    if (userAddress) {
      window.open(`https://bscscan.com/address/${userAddress}`, '_blank')
    } else {
      alert('Please connect your wallet first')
    }
  }

  const scrollToWhitelist = () => {
    // Scroll to whitelist section on the page
    const whitelistButtons = document.querySelectorAll('[class*="whitelist"]')
    if (whitelistButtons.length > 0) {
      whitelistButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      // Fallback: scroll down to features section
      window.scrollBy({ top: 800, behavior: 'smooth' })
    }
  }

  return (
    <div className="card-quantum">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="h-5 w-5 text-orange-500" />
        <h4 className="text-lg font-bold text-quantum text-orange-500">{t('quickActions.title')}</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={downloadAllTracks}
          disabled={totalTracks === 0}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 glow-orange disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title={totalTracks === 0 ? 'No tracks to download' : 'Download all your tracks'}
        >
          <Download className="h-5 w-5" />
          <span className="font-bold text-quantum">{t('quickActions.downloadAll')}</span>
        </button>
        
        <button
          onClick={viewOnBSCScan}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-orange-500 border-2 border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105"
          title="View your address on BSCScan"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="font-bold text-quantum">{t('quickActions.viewOnBSC')}</span>
        </button>
        
        <button
          onClick={scrollToWhitelist}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-yellow-500 border-2 border-yellow-600 hover:border-yellow-500 rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105"
          title="Join whitelist to win free WeAD tokens"
        >
          <Trophy className="h-5 w-5" />
          <span className="font-bold text-quantum">{t('quickActions.joinWhitelist')}</span>
        </button>
        
        <button
          onClick={loadMusicFiles}
          disabled={!userAddress}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-green-500 border-2 border-green-900 hover:border-green-500 rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title={!userAddress ? 'Connect wallet to refresh' : 'Refresh your music library'}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="font-bold text-quantum">{t('quickActions.refreshStats')}</span>
        </button>
      </div>
    </div>
  )
}

