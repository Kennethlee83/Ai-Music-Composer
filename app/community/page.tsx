'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SimpleWallet } from '@/components/SimpleWallet'
import { ProfileCreation } from '@/components/ProfileCreation'
import { MusicSharing } from '@/components/MusicSharing'
import { CommunityChat } from '@/components/CommunityChat'
import { Users, Wallet } from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  walletAddress: string
  displayName: string
  bio: string
  createdAt: number
  stats: {
    tracksShared: number
    totalPlays: number
  }
}

export default function CommunityPage() {
  const { t } = useTranslation()
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [refreshFeed, setRefreshFeed] = useState(0)

  useEffect(() => {
    checkWallet()
    
    // Listen for wallet events
    const handleWalletConnect = (event: any) => {
      const address = event.detail?.address
      if (address) {
        setUserAddress(address)
        loadUserProfile(address)
      }
    }
    
    const handleWalletDisconnect = () => {
      setUserAddress(null)
      setUserProfile(null)
    }
    
    window.addEventListener('walletConnected', handleWalletConnect)
    window.addEventListener('walletDisconnected', handleWalletDisconnect)
    
    return () => {
      window.removeEventListener('walletConnected', handleWalletConnect)
      window.removeEventListener('walletDisconnected', handleWalletDisconnect)
    }
  }, [])

  const checkWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setUserAddress(accounts[0])
          loadUserProfile(accounts[0])
        }
      }
    } catch (error) {
      console.error('Error checking wallet:', error)
    }
  }

  const loadUserProfile = async (address: string) => {
    try {
      const response = await fetch(`/api/community/profile?address=${address}`)
      const data = await response.json()
      
      if (data.success && data.profile) {
        setUserProfile(data.profile)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const handleProfileUpdated = (profile: UserProfile) => {
    setUserProfile(profile)
  }

  const handleMusicShared = () => {
    // Trigger feed refresh
    setRefreshFeed(prev => prev + 1)
  }

  return (
    <div className="min-h-screen quantum-gradient relative overflow-hidden">
      {/* Quantum Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-700 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black bg-opacity-80 backdrop-blur-md border-b-2 border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 glow-orange"
                aria-label="Menu"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logo (desktop only) */}
              <Link href="/" className="hidden md:block">
                <img src="/wead-logo.png" alt="WeAD Logo" className="h-12 w-12 rounded-lg glow-orange cursor-pointer hover:scale-110 transition-transform" />
              </Link>
              <div className="hidden md:block">
                <h1 className="text-3xl" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    {t('header.community')}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">{t('community.subtitle')}</p>
              </div>
            </div>
            <SimpleWallet />
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t-2 border-gray-800">
            <div className="container mx-auto px-4 py-4 space-y-2">
              <Link 
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg hover:from-orange-800 hover:to-red-800 transition-all"
              >
                <span className="text-orange-400 text-xl">🏠</span>
                <span className="text-white font-bold text-quantum">{t('header.home')}</span>
              </Link>
              <Link 
                href="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg glow-orange"
              >
                <span className="text-yellow-400 text-xl">⭐</span>
                <span className="text-white font-bold text-quantum">{t('header.community')}</span>
              </Link>
              <Link 
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500 rounded-lg hover:from-green-800 hover:to-emerald-800 transition-all"
              >
                <span className="text-green-400 text-xl">🛒</span>
                <span className="text-white font-bold text-quantum">{t('header.marketplace')}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Navigation (desktop) */}
      <div className="relative z-10 bg-black bg-opacity-60 backdrop-blur-sm border-b border-gray-800 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            <Link 
              href="/"
              className="px-6 py-3 text-gray-400 hover:text-orange-500 hover:bg-gray-900 transition-all text-quantum font-bold"
            >
              Home
            </Link>
            <Link 
              href="/community"
              className="px-6 py-3 text-orange-500 bg-gray-900 border-b-2 border-orange-500 transition-all text-quantum font-bold"
            >
              Community
            </Link>
            <Link 
              href="/marketplace"
              className="px-6 py-3 text-gray-400 hover:text-orange-500 hover:bg-gray-900 transition-all text-quantum font-bold"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {!userAddress ? (
          <div className="max-w-2xl mx-auto">
            <div className="card-quantum text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center glow-orange mx-auto mb-6">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl text-quantum text-orange-500 mb-4">{t('community.connectToJoin')}</h2>
              <p className="text-gray-400 text-lg mb-6">
                {t('community.connectDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="flex items-center space-x-2 text-gray-400">
                  <span className="text-orange-500">✓</span>
                  <span>{t('community.createProfile')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <span className="text-orange-500">✓</span>
                  <span>{t('community.shareMusic')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <span className="text-orange-500">✓</span>
                  <span>{t('community.discoverTracks')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Column - Profile & Sharing */}
            <div className="space-y-6">
              <ProfileCreation 
                walletAddress={userAddress}
                onProfileUpdated={handleProfileUpdated}
              />
              
              <MusicSharing 
                walletAddress={userAddress}
                displayName={userProfile?.displayName || 'Anonymous'}
                onMusicShared={handleMusicShared}
              />
            </div>

            {/* Right Column - Community Chat */}
            <div className="space-y-6">
              <CommunityChat 
                walletAddress={userAddress}
                displayName={userProfile?.displayName || 'Anonymous'}
              />
            </div>
          </div>
        )}

        {/* Community Stats */}
        <div className="mt-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-quantum text-center p-6">
              <div className="text-4xl mb-3">👥</div>
              <div className="text-2xl font-bold text-orange-500 text-quantum mb-2">{t('header.community')}</div>
              <p className="text-gray-400">{t('community.features.share')}</p>
            </div>
            <div className="card-quantum text-center p-6">
              <div className="text-4xl mb-3">🎁</div>
              <div className="text-2xl font-bold text-orange-500 text-quantum mb-2">Free</div>
              <p className="text-gray-400">{t('community.features.free')}</p>
            </div>
            <div className="card-quantum text-center p-6">
              <div className="text-4xl mb-3">⛓️</div>
              <div className="text-2xl font-bold text-orange-500 text-quantum mb-2">Web3</div>
              <p className="text-gray-400">{t('community.features.web3')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-gray-800 bg-black bg-opacity-80 backdrop-blur-md mt-16">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Logo & Tagline */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
              <img src="/wead-logo.png" alt="WeAD Logo" className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg glow-orange" />
              <span className="text-base sm:text-lg md:text-xl font-bold text-quantum text-orange-500 text-center px-2">
                WeAD Ecosystem • 250+ Web3 Ad Partners Worldwide
              </span>
            </div>
          </div>

          {/* Social Links - Circular Icons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
            <a
              href="https://www.wead.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-2xl transition-all duration-300 transform hover:scale-110"
              title="WeAD Main"
            >
              W
            </a>
            <a
              href="https://www.weadredflag.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-300 transform hover:scale-110"
              title="WeAD RedFlag"
            >
              🧠
            </a>
            <a
              href="https://www.weadretrogameplatform.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-300 transform hover:scale-110"
              title="WeAD Retro Tournament"
            >
              🎮
            </a>
            <a
              href="https://t.me/WeAdvertizers"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm transition-all duration-300 transform hover:scale-110"
              title="Telegram"
            >
              TG
            </a>
            <a
              href="https://discord.gg/8z73JGnk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-lg transition-all duration-300 transform hover:scale-110"
              title="Discord"
            >
              D
            </a>
            <a
              href="https://www.linkedin.com/company/weadvertize"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-lg transition-all duration-300 transform hover:scale-110"
              title="LinkedIn"
            >
              in
            </a>
            <a
              href="https://x.com/WeADvertizers"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-lg transition-all duration-300 transform hover:scale-110"
              title="X (Twitter)"
            >
              𝕏
            </a>
            <a
              href="https://www.facebook.com/Weadvertize/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-orange-900 hover:border-orange-500 rounded-full flex items-center justify-center text-orange-500 font-bold text-lg transition-all duration-300 transform hover:scale-110"
              title="Facebook"
            >
              f
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center border-t border-gray-800 pt-3 sm:pt-4">
            <p className="text-quantum text-gray-400 text-xs sm:text-sm px-2">© 2025 WeAD AI Composer • Powered by BSC Mainnet, Chainlink Oracle & Cross-Chain Technology</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

