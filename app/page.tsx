'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SimpleWallet } from '@/components/SimpleWallet'
import { SimpleMusicGeneration } from '@/components/SimpleMusicGeneration'
import { LocalMusicPlayer } from '@/components/LocalMusicPlayer'
import { WhitelistModal } from '@/components/WhitelistModal'
import { UserProfile } from '@/components/UserProfile'
import { QuickActions } from '@/components/QuickActions'
import { MarketplaceStats } from '@/components/MarketplaceStats'
import LanguageSelector from '@/components/LanguageSelector'
import Link from 'next/link'

export default function Home() {
  const { t } = useTranslation()
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  const bannerMessages = [
    t('banner.launching'),
    t('banner.winFree'),
    t('banner.joinWhitelist'),
    t('banner.futurePayments'),
    t('banner.registerCredit'),
    t('banner.mobileMetamask')
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerMessages.length)
    }, 4000) // Change message every 4 seconds
    return () => clearInterval(interval)
  }, [])

  const toggleTooltip = (tooltipName: string) => {
    setActiveTooltip(activeTooltip === tooltipName ? null : tooltipName)
  }
  return (
    <div className="min-h-screen quantum-gradient relative overflow-hidden">
      {/* Quantum Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-700 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-black bg-opacity-80 backdrop-blur-md border-b-2 border-gray-800">
        {/* Main Header Row */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6">
              {/* Mobile Menu Button (shows on mobile only) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 glow-orange"
                aria-label="Menu"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Mobile Language Button - Square with "L" (gold) */}
              <div className="md:hidden">
                <LanguageSelector />
              </div>

              {/* Mobile Notification Button - Square blue with bell icon */}
              <button
                onClick={() => setNotificationOpen(true)}
                className="md:hidden w-10 h-10 bg-gradient-to-r from-blue-900 to-blue-800 border-2 border-blue-500 rounded-lg flex items-center justify-center transition-all hover:from-blue-800 hover:to-blue-700"
                aria-label="Notifications"
              >
                <span className="text-xl">🔔</span>
              </button>

              {/* Logo (shows on desktop only) */}
              <Link href="/" className="hidden md:block">
                <img src="/wead-logo.png" alt="WeAD Logo" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg glow-orange cursor-pointer hover:scale-110 transition-transform" />
              </Link>
              
              {/* Navigation Links (desktop only) - 30% smaller */}
              <div className="hidden md:flex items-center space-x-2">
                <Link 
                  href="/community"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-900 to-blue-900 border-2 border-blue-500 rounded-lg hover:from-purple-800 hover:to-blue-800 transition-all glow-blue"
                >
                  <span className="text-yellow-400 text-sm">⭐</span>
                  <span className="text-white text-xs font-bold text-quantum">{t('header.community')}</span>
                </Link>
                <Link 
                  href="/marketplace"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500 rounded-lg hover:from-green-800 hover:to-emerald-800 transition-all"
                >
                  <span className="text-green-400 text-sm">🛒</span>
                  <span className="text-white text-xs font-bold text-quantum">{t('header.marketplace')}</span>
                </Link>
                
                {/* Language Button - Desktop (Gold, after Marketplace) */}
                <LanguageSelector />
                
                {/* Rotating Banner - Between buttons and wallet - 30% longer */}
                <div className="relative overflow-hidden bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg px-3 py-1.5 glow-orange mx-2">
                  <div className="relative h-5 overflow-hidden w-[364px]">
                    {bannerMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                          index === bannerIndex
                            ? 'opacity-100 translate-y-0'
                            : index < bannerIndex
                            ? 'opacity-0 -translate-y-full'
                            : 'opacity-0 translate-y-full'
                        }`}
                      >
                        <span className="text-xs font-bold text-quantum text-white whitespace-nowrap">
                          {message}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer pointer-events-none"></div>
                </div>
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
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg glow-orange"
              >
                <span className="text-orange-400 text-xl">🏠</span>
                <span className="text-white font-bold text-quantum">{t('header.home')}</span>
              </Link>
              <Link 
                href="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-purple-900 to-blue-900 border-2 border-blue-500 rounded-lg hover:from-purple-800 hover:to-blue-800 transition-all"
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
      
      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-4 sm:space-y-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl heading-quantum mb-4 sm:mb-6 animate-pulse leading-tight">
            WeAD AI COMPOSER
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-quantum text-gray-300 mb-2 sm:mb-4 px-2">
            {t('hero.subtitle')}
          </p>
          
          {/* Mobile Banner - Show on mobile only */}
          <button
            onClick={() => setIsWhitelistModalOpen(true)}
            className="lg:hidden bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg px-4 py-3 mx-auto max-w-sm hover:from-orange-800 hover:to-red-800 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <p className="text-sm font-bold text-quantum text-white">
              🎁 {t('hero.whitelistButton')}
            </p>
            <p className="text-xs text-quantum text-orange-200">
              {t('hero.whitelistSubtext')}
            </p>
            <p className="text-xs text-orange-400 mt-1">{t('hero.whitelistTap')}</p>
          </button>
          
          {/* Stats Bar */}
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 flex-wrap">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-500 text-quantum">{t('hero.instant')}</div>
              <div className="text-xs sm:text-sm text-gray-400">{t('hero.generation')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-500 text-quantum">$0.10</div>
              <div className="text-xs sm:text-sm text-gray-400">{t('hero.perTrack')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-500 text-quantum">100+</div>
              <div className="text-xs sm:text-sm text-gray-400">{t('hero.musicStyles')}</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto lg:items-start">
          <div className="space-y-6 flex flex-col">
            <SimpleMusicGeneration />
            <QuickActions />
            <MarketplaceStats />
          </div>
          
          <div className="space-y-6 flex flex-col">
            <LocalMusicPlayer />
            <UserProfile />
          </div>
        </div>

        {/* Bot & Community Links */}
        <div className="mt-8 sm:mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Telegram Bot */}
          <div className="group relative">
            <div className="relative">
              <a 
                href="https://t.me/weadcomposerbot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="card-quantum text-center p-8 hover:scale-105 transition-transform duration-300 cursor-pointer block min-h-[250px] flex flex-col justify-center"
              >
                <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('bots.telegramTitle')}</h3>
                <p className="text-gray-300 font-semibold mb-2">{t('bots.botName')}</p>
                <p className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  @weadcomposerbot
                </p>
                <p className="text-xs text-gray-500 mt-3">{t('bots.clickToLaunch')}</p>
              </a>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTooltip('telegram')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-72 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'telegram' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">{t('bots.transformTelegram')}</p>
              <p>{t('bots.transformDescription')}</p>
            </div>
          </div>

          {/* Discord Bot */}
          <div className="group relative">
            <div className="relative card-quantum text-center p-8 opacity-75 cursor-not-allowed min-h-[250px] flex flex-col justify-center">
              <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('bots.discordTitle')}</h3>
              <p className="text-gray-300 font-semibold mb-2">{t('bots.botName')}</p>
              <div className="inline-block px-4 py-2 bg-orange-900 bg-opacity-50 rounded-lg border border-gray-700 mt-2">
                <p className="text-sm text-orange-400">{t('bots.comingSoon')}</p>
              </div>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTooltip('discord')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-72 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'discord' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">{t('bots.discordTooltipTitle')}</p>
              <p>{t('bots.discordTooltipDescription')}</p>
            </div>
          </div>

          {/* WeAD Community */}
          <div className="group relative">
            <div className="relative card-quantum text-center p-8 opacity-75 cursor-not-allowed min-h-[250px] flex flex-col justify-center">
              <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('sections.musicCommunityTitle')}</h3>
              <p className="text-gray-300 font-semibold mb-2">{t('sections.joinCommunity')}</p>
              <div className="inline-block px-4 py-2 bg-orange-900 bg-opacity-50 rounded-lg border border-gray-700 mt-2">
                <p className="text-sm text-orange-400">{t('bots.comingSoon')}</p>
              </div>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTooltip('community')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-72 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'community' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">{t('bots.communityTooltipTitle')}</p>
              <p>{t('bots.communityTooltipDescription')}</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-6 sm:mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Whitelist Box */}
          <div className="group relative">
            <div className="relative">
              <button
                onClick={() => setIsWhitelistModalOpen(true)}
                className="card-quantum text-center p-8 hover:scale-105 transition-transform duration-300 cursor-pointer w-full min-h-[250px] flex flex-col justify-center"
              >
                <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('sections.whitelistTitle')}</h3>
                <p className="text-gray-300 font-semibold mb-2">{t('sections.exclusiveAccess')}</p>
                <p className="text-sm text-orange-400">{t('sections.clickToRegister')}</p>
              </button>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleTooltip('whitelist')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'whitelist' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">💰 Win WeAD Tokens</p>
              <p className="mb-2">{t('sections.whitelistInfo')}</p>
              <p className="text-orange-400 font-semibold">{t('sections.whitelistCta')}</p>
            </div>
          </div>
          <div className="group relative">
            <div className="relative card-quantum text-center p-8 min-h-[250px] flex flex-col justify-center">
              <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('sections.web3Title')}</h3>
              <p className="text-gray-300 font-semibold mb-2">{t('sections.secureDecentralized')}</p>
              <p className="text-sm text-gray-400">{t('sections.poweredByBlockchain')}</p>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTooltip('web3')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-72 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'web3' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">🔐 Secure Payment System</p>
              <p>All payments are processed on BSC Mainnet blockchain using smart contracts. Your transactions are transparent, secure, and decentralized.</p>
            </div>
          </div>
          <div className="group relative">
            <div className="relative card-quantum text-center p-8 min-h-[250px] flex flex-col justify-center">
              <h3 className="text-xl text-quantum text-orange-500 mb-3 font-bold">{t('sections.yourMusicTitle')}</h3>
              <p className="text-gray-300 font-semibold mb-2">{t('sections.instantDownloads')}</p>
              <p className="text-sm text-gray-400">{t('sections.downloadMp3')}</p>
              {/* Mobile Info Button - Only visible on mobile */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTooltip('yourmusic')
                }}
                className="md:hidden absolute top-3 right-3 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10"
                aria-label="Show info"
              >
                ℹ️
              </button>
            </div>
            {/* Tooltip - Hover on desktop, tap toggle on mobile */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-72 bg-black border-2 border-orange-500 rounded-lg p-4 text-sm text-gray-300 z-50 shadow-lg ${activeTooltip === 'yourmusic' ? 'block md:hidden' : 'hidden'} md:group-hover:block`}>
              <p className="font-bold text-orange-500 mb-2">🎵 Your Music Library</p>
              <p>{t('bots.musicLibraryTooltipDescription')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-gray-800 bg-black bg-opacity-80 backdrop-blur-md mt-8 sm:mt-12 md:mt-16">
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

      {/* Notification Popup (Mobile Only) */}
      {notificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-blue-950 via-black to-blue-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-400 text-quantum">📢 IMPORTANT INFO</h3>
              <button
                onClick={() => setNotificationOpen(false)}
                className="w-8 h-8 bg-blue-900 bg-opacity-50 hover:bg-opacity-70 rounded-lg flex items-center justify-center transition-all"
              >
                <span className="text-blue-400 text-xl font-bold">✕</span>
              </button>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-600 rounded-lg p-4">
                <p className="text-white text-sm text-quantum">
                  🎁 {t('banner.registerCredit')}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-600 rounded-lg p-4">
                <p className="text-white text-sm text-quantum">
                  📱 {t('banner.mobileMetamask')}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setNotificationOpen(false)}
              className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg transition-all transform active:scale-95"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}

      {/* Whitelist Modal */}
      <WhitelistModal 
        isOpen={isWhitelistModalOpen} 
        onClose={() => setIsWhitelistModalOpen(false)} 
      />
    </div>
  )
}


