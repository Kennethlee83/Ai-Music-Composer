'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SimpleWallet } from '@/components/SimpleWallet'
import { ShoppingCart, Music, Play, Pause, Download, DollarSign, Users, Search, Filter, Heart, UserPlus, UserMinus, X, SkipForward, SkipBack } from 'lucide-react'
import Link from 'next/link'

interface SharedTrack {
  id: string
  walletAddress: string
  displayName: string
  avatar?: string
  title: string
  style: string
  description: string
  filename: string
  sharedAt: number
  size: number
  likeCount?: number
  isLiked?: boolean
}

interface TradeListing {
  id: string
  trackId: string
  walletAddress: string
  displayName: string
  avatar?: string
  trackTitle: string
  trackStyle: string
  filename: string
  price: string
  currency: 'WeAD' | 'BNB'
  listedAt: number
  sold: boolean
}

export default function MarketplacePage() {
  const { t } = useTranslation()
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [sharedTracks, setSharedTracks] = useState<SharedTrack[]>([])
  const [listings, setListings] = useState<TradeListing[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buying, setBuying] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Follow system
  const [followingMap, setFollowingMap] = useState<{[address: string]: boolean}>({})
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  useEffect(() => {
    checkWallet()
    loadData()
    
    // Listen for wallet events
    const handleWalletConnect = (event: any) => {
      setUserAddress(event.detail?.address)
    }
    
    const handleWalletDisconnect = () => {
      setUserAddress(null)
    }
    
    window.addEventListener('walletConnected', handleWalletConnect)
    window.addEventListener('walletDisconnected', handleWalletDisconnect)
    
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('walletConnected', handleWalletConnect)
      window.removeEventListener('walletDisconnected', handleWalletDisconnect)
    }
  }, [])

  // Reload data when wallet changes to update like states and follow status
  useEffect(() => {
    if (userAddress) {
      loadData()
      loadFollowStatus()
    }
  }, [userAddress])

  // Load follow status when tracks or listings change
  useEffect(() => {
    if (userAddress && (sharedTracks.length > 0 || listings.length > 0)) {
      loadFollowStatus()
    }
  }, [sharedTracks, listings])

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

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load shared tracks
      const sharedResponse = await fetch('/api/community/share-music')
      const sharedData = await sharedResponse.json()
      if (sharedData.success) {
        // Load likes for each track
        const tracksWithLikes = await Promise.all(
          sharedData.tracks.map(async (track: SharedTrack) => {
            try {
              const likesResponse = await fetch(`/api/community/like?trackId=${track.id}`)
              const likesData = await likesResponse.json()
              if (likesData.success) {
                return {
                  ...track,
                  likeCount: likesData.likes.likeCount || 0,
                  isLiked: userAddress ? likesData.likes.likes.includes(userAddress) : false
                }
              }
            } catch {
              return { ...track, likeCount: 0, isLiked: false }
            }
            return track
          })
        )
        setSharedTracks(tracksWithLikes)
      }
      
      // Load marketplace listings
      const listingsResponse = await fetch('/api/community/trade')
      const listingsData = await listingsResponse.json()
      if (listingsData.success) {
        setListings(listingsData.listings)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUniqueGenres = () => {
    const sharedGenres = sharedTracks.map(track => track.style)
    const listingGenres = listings.map(listing => listing.trackStyle)
    const allGenres = [...sharedGenres, ...listingGenres]
    const genres = new Set(allGenres.filter(Boolean))
    return Array.from(genres).sort()
  }

  const filterSharedTracks = () => {
    let filtered = [...sharedTracks]
    
    if (searchTerm) {
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.style.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(track => track.style.toLowerCase() === selectedGenre.toLowerCase())
    }
    
    return filtered
  }

  const filterListings = () => {
    let filtered = [...listings]
    
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.trackTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.trackStyle.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(listing => listing.trackStyle.toLowerCase() === selectedGenre.toLowerCase())
    }
    
    return filtered
  }

  const playNextTrack = (currentTrackId: string) => {
    // Combine all tracks in order: shared first, then for sale
    const allTracks = [
      ...filteredShared.map(t => ({ id: t.id, filename: t.filename, walletAddress: t.walletAddress })),
      ...filteredListings.map(l => ({ id: l.id, filename: l.filename, walletAddress: l.walletAddress }))
    ]

    // Find current track index
    const currentIndex = allTracks.findIndex(t => t.id === currentTrackId)
    
    // Get next track
    if (currentIndex !== -1 && currentIndex < allTracks.length - 1) {
      const nextTrack = allTracks[currentIndex + 1]
      console.log(`🎵 Auto-playing next track: ${nextTrack.id}`)
      togglePlayPause(nextTrack.filename, nextTrack.walletAddress, nextTrack.id)
    } else {
      // No more tracks, stop
      console.log('🎵 Playlist ended')
      setPlayingTrack(null)
      setAudioElement(null)
      setIsPaused(false)
    }
  }

  const togglePlayPause = async (filename: string, ownerAddress: string, trackId: string) => {
    try {
      if (playingTrack === trackId && audioElement) {
        if (isPaused) {
          audioElement.play()
          setIsPaused(false)
        } else {
          audioElement.pause()
          setIsPaused(true)
        }
        return
      }

      if (audioElement) {
        audioElement.pause()
        setAudioElement(null)
        setPlayingTrack(null)
        setIsPaused(false)
        setCurrentTime(0)
        setDuration(0)
      }

      const audio = new Audio(`/api/local-music?filename=${filename}&userAddress=${ownerAddress}`)
      audio.preload = 'metadata'
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })
      
      audio.addEventListener('loadeddata', () => {
        audio.play().catch(err => {
          console.error('Play error:', err)
        })
        setPlayingTrack(trackId)
        setAudioElement(audio)
        setIsPaused(false)
      })

      audio.addEventListener('ended', () => {
        // Auto-play next track
        playNextTrack(trackId)
      })

      audio.addEventListener('error', () => {
        setPlayingTrack(null)
        setAudioElement(null)
        setCurrentTime(0)
        setDuration(0)
      })
    } catch (error) {
      console.error('Error playing music:', error)
    }
  }

  const playNext = () => {
    if (!playingTrack) return
    
    const currentShared = filterSharedTracks()
    const currentListings = filterListings()
    
    const allTracks = [
      ...currentShared.map(t => ({ id: t.id, filename: t.filename, walletAddress: t.walletAddress })),
      ...currentListings.map(l => ({ id: l.id, filename: l.filename, walletAddress: l.walletAddress }))
    ]
    
    const currentIndex = allTracks.findIndex(t => t.id === playingTrack)
    if (currentIndex !== -1 && currentIndex < allTracks.length - 1) {
      const nextTrack = allTracks[currentIndex + 1]
      togglePlayPause(nextTrack.filename, nextTrack.walletAddress, nextTrack.id)
    }
  }

  const playPrevious = () => {
    if (!playingTrack) return
    
    const currentShared = filterSharedTracks()
    const currentListings = filterListings()
    
    const allTracks = [
      ...currentShared.map(t => ({ id: t.id, filename: t.filename, walletAddress: t.walletAddress })),
      ...currentListings.map(l => ({ id: l.id, filename: l.filename, walletAddress: l.walletAddress }))
    ]
    
    const currentIndex = allTracks.findIndex(t => t.id === playingTrack)
    if (currentIndex > 0) {
      const prevTrack = allTracks[currentIndex - 1]
      togglePlayPause(prevTrack.filename, prevTrack.walletAddress, prevTrack.id)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || !duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    
    audioElement.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const downloadTrack = (filename: string, ownerAddress: string, title: string) => {
    const link = document.createElement('a')
    link.href = `/api/local-music?filename=${filename}&userAddress=${ownerAddress}`
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleLike = async (track: SharedTrack) => {
    if (!userAddress) {
      alert('Please connect your wallet to like tracks')
      return
    }

    try {
      // Optimistically update UI first for responsiveness
      setSharedTracks(prev => prev.map(t => 
        t.id === track.id 
          ? { 
              ...t, 
              likeCount: t.isLiked ? (t.likeCount || 1) - 1 : (t.likeCount || 0) + 1,
              isLiked: !t.isLiked 
            }
          : t
      ))

      const response = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          walletAddress: userAddress
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Update with server response
        setSharedTracks(prev => prev.map(t => 
          t.id === track.id 
            ? { ...t, likeCount: data.likes.likeCount, isLiked: data.action === 'liked' }
            : t
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revert optimistic update on error
      setSharedTracks(prev => prev.map(t => 
        t.id === track.id 
          ? { ...t, isLiked: !t.isLiked, likeCount: t.isLiked ? (t.likeCount || 0) + 1 : (t.likeCount || 1) - 1 }
          : t
      ))
    }
  }

  const buyTrack = async (listing: TradeListing) => {
    if (!userAddress) {
      alert('Please connect your wallet to buy tracks')
      return
    }

    if (listing.walletAddress.toLowerCase() === userAddress.toLowerCase()) {
      alert('You cannot buy your own track!')
      return
    }

    if (!confirm(`Buy "${listing.trackTitle}" for ${listing.price} ${listing.currency}?`)) {
      return
    }

    try {
      setBuying(listing.id)
      
      if (typeof window === 'undefined' || !window.ethereum) {
        alert('MetaMask not found')
        return
      }

      const provider = window.ethereum
      
      if (listing.currency === 'BNB') {
        const amountWei = (parseFloat(listing.price) * 1e18).toString(16)
        
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: userAddress,
            to: listing.walletAddress,
            value: '0x' + amountWei,
          }]
        })

        console.log('Transaction hash:', txHash)
        
        await fetch('/api/community/trade', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            buyer: userAddress
          })
        })

        downloadTrack(listing.filename, listing.walletAddress, listing.trackTitle)
        
        alert(`Purchase successful! Transaction: ${txHash}\nYour track is downloading...`)
        loadData()
        
      } else {
        alert('WeAD token payments coming soon! Please use BNB for now.')
      }
      
    } catch (error: any) {
      console.error('Error buying track:', error)
      if (error.code === 4001) {
        alert('Transaction cancelled')
      } else {
        alert('Purchase failed: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setBuying(null)
    }
  }

  const deleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to remove this listing?')) return

    try {
      const response = await fetch(`/api/community/trade?id=${listingId}&address=${userAddress}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Listing removed successfully!')
        loadData()
      } else {
        alert('Failed to remove listing')
      }
    } catch (error) {
      console.error('Error removing listing:', error)
      alert('Error removing listing')
    }
  }

  const deleteSharedTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to remove this shared track?')) return

    try {
      const response = await fetch(`/api/community/share-music?id=${trackId}&address=${userAddress}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Shared track removed successfully!')
        loadData()
      } else {
        alert('Failed to remove track')
      }
    } catch (error) {
      console.error('Error removing track:', error)
      alert('Error removing track')
    }
  }

  const loadFollowStatus = async () => {
    if (!userAddress) return

    try {
      // Get all unique wallet addresses from tracks and listings
      const allAddresses = new Set<string>()
      sharedTracks.forEach(track => allAddresses.add(track.walletAddress))
      listings.forEach(listing => allAddresses.add(listing.walletAddress))

      // Check follow status for each
      const followMap: {[address: string]: boolean} = {}
      
      for (const address of allAddresses) {
        if (address.toLowerCase() === userAddress.toLowerCase()) continue
        
        const response = await fetch(`/api/community/follow?address=${userAddress}&target=${address}`)
        const data = await response.json()
        
        if (data.success) {
          followMap[address] = data.isFollowing || false
        }
      }

      setFollowingMap(followMap)
    } catch (error) {
      console.error('Error loading follow status:', error)
    }
  }

  const toggleFollow = async (artistAddress: string) => {
    if (!userAddress) {
      alert('Please connect your wallet to follow artists')
      return
    }

    if (artistAddress.toLowerCase() === userAddress.toLowerCase()) {
      return // Can't follow yourself
    }

    try {
      setFollowLoading(artistAddress)
      const isCurrentlyFollowing = followingMap[artistAddress] || false
      const action = isCurrentlyFollowing ? 'unfollow' : 'follow'

      const response = await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerAddress: userAddress,
          targetAddress: artistAddress,
          action
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update follow status
        setFollowingMap(prev => ({
          ...prev,
          [artistAddress]: !isCurrentlyFollowing
        }))
      } else {
        alert(data.error || 'Failed to follow/unfollow user')
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error)
      alert('Failed to follow/unfollow user')
    } finally {
      setFollowLoading(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const filteredShared = filterSharedTracks()
  const filteredListings = filterListings()

  return (
    <div className="min-h-screen quantum-gradient relative overflow-hidden">
      {/* Quantum Background */}
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
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    {t('header.marketplace')}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">{t('marketplace.subtitle')}</p>
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
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-orange-900 to-red-900 border-2 border-orange-500 rounded-lg hover:from-orange-800 hover:to-red-800 transition-all"
              >
                <span className="text-yellow-400 text-xl">⭐</span>
                <span className="text-white font-bold text-quantum">{t('header.community')}</span>
              </Link>
              <Link 
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500 rounded-lg glow-orange"
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
              className="px-6 py-3 text-gray-400 hover:text-orange-500 hover:bg-gray-900 transition-all text-quantum font-bold"
            >
              Community
            </Link>
            <Link 
              href="/marketplace"
              className="px-6 py-3 text-orange-500 bg-gray-900 border-b-2 border-orange-500 transition-all text-quantum font-bold"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracks or artists..."
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
              >
                <option value="all">All Genres</option>
                {getUniqueGenres().map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Split View - Shared Tracks (Left) | Marketplace (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          
          {/* LEFT: Shared Tracks (Free Music) */}
          <div className="card-quantum">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl text-quantum text-blue-500">{t('marketplace.sharedMusic')}</h3>
              <div className="flex-1"></div>
              <div className="px-3 py-1 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
                <span className="text-blue-400 text-xs text-quantum">{filteredShared.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              </div>
            ) : filteredShared.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No tracks found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredShared.map((track) => (
                  <div key={track.id} className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-3 hover:border-blue-500 transition-all">
                    <div className="flex justify-between items-center gap-3">
                      {/* Profile Avatar */}
                      <div className="flex-shrink-0">
                        {track.avatar ? (
                          <img
                            src={track.avatar}
                            alt={track.displayName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center border-2 border-blue-500">
                            <span className="text-white text-sm text-quantum">
                              {track.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-blue-400 text-sm truncate text-quantum">{track.title}</h4>
                        <p className="text-xs text-gray-500 truncate">by {track.displayName}</p>
                        <p className="text-xs text-gray-600 mt-1">{track.style}</p>
                        
                        {/* Progress bar when playing */}
                        {playingTrack === track.id && duration > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                            <div 
                              className="w-full bg-gray-800 rounded-full h-2 cursor-pointer hover:h-2.5 transition-all group"
                              onClick={handleSeek}
                              title="Click to seek"
                            >
                              <div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-200 relative"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {/* Follow Button */}
                        {userAddress && track.walletAddress.toLowerCase() !== userAddress.toLowerCase() && (
                          <button
                            onClick={() => toggleFollow(track.walletAddress)}
                            disabled={followLoading === track.walletAddress}
                            className={`p-2 rounded transition-all ${
                              followingMap[track.walletAddress]
                                ? 'bg-green-900 hover:bg-green-800 text-green-400'
                                : 'bg-blue-900 hover:bg-blue-800 text-blue-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={followingMap[track.walletAddress] ? 'Unfollow' : 'Follow'}
                          >
                            {followingMap[track.walletAddress] ? (
                              <UserMinus className="h-4 w-4" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => toggleLike(track)}
                          disabled={!userAddress}
                          className={`p-2 rounded transition-all ${
                            track.isLiked 
                              ? 'bg-pink-900 hover:bg-pink-800' 
                              : 'bg-gray-800 hover:bg-gray-700 hover:bg-pink-900'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={track.isLiked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`h-4 w-4 ${track.isLiked ? 'fill-pink-400 text-pink-400' : 'text-gray-400'}`} />
                        </button>
                        <div className={`px-1.5 py-2 rounded flex items-center justify-center min-w-[36px] ${
                          track.isLiked ? 'bg-pink-900' : 'bg-gray-800'
                        }`}>
                          <span className={`text-xs text-quantum whitespace-nowrap ${track.isLiked ? 'text-pink-400' : 'text-gray-400'}`}>
                            {(track.likeCount || 0) >= 1000000 
                              ? `${((track.likeCount || 0) / 1000000).toFixed(1)}M`
                              : (track.likeCount || 0) >= 1000
                              ? `${((track.likeCount || 0) / 1000).toFixed(1)}K`
                              : track.likeCount || 0}
                          </span>
                        </div>
                        {/* Previous button when this track is playing */}
                        {playingTrack === track.id && (
                          <button
                            onClick={playPrevious}
                            disabled={filteredShared.findIndex(t => t.id === track.id) === 0 && filteredListings.length === 0}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous Track"
                          >
                            <SkipBack className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => togglePlayPause(track.filename, track.walletAddress, track.id)}
                          className="p-2 bg-blue-900 hover:bg-blue-800 text-blue-400 rounded transition-all"
                        >
                          {playingTrack === track.id && !isPaused ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Next button when this track is playing */}
                        {playingTrack === track.id && (
                          <button
                            onClick={playNext}
                            disabled={filteredShared.findIndex(t => t.id === track.id) === filteredShared.length - 1 && filteredListings.length === 0}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next Track"
                          >
                            <SkipForward className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* Delete button for owner only */}
                        {userAddress && track.walletAddress.toLowerCase() === userAddress.toLowerCase() && (
                          <button
                            onClick={() => deleteSharedTrack(track.id)}
                            className="p-2 bg-red-900 hover:bg-red-800 text-red-400 rounded transition-all"
                            title="Remove track"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Marketplace (For Sale) */}
          <div className="card-quantum">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl text-quantum text-green-500">{t('marketplace.forSale')}</h3>
              <div className="flex-1"></div>
              <div className="px-3 py-1 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
                <span className="text-green-400 text-xs text-quantum">{filteredListings.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No tracks for sale</p>
                <p className="text-xs text-gray-600 mt-2">List yours in Community page!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="bg-gradient-to-r from-gray-900 to-black border-2 border-green-800 rounded-lg p-4 hover:border-green-500 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-3 flex-1">
                        {/* Profile Avatar */}
                        <div className="flex-shrink-0">
                          {listing.avatar ? (
                            <img
                              src={listing.avatar}
                              alt={listing.displayName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center border-2 border-green-500">
                              <span className="text-white text-quantum">
                                {listing.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <h4 className="text-green-500 text-quantum">{listing.trackTitle}</h4>
                          </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-400">
                            by <span className="text-orange-500">{listing.displayName}</span>
                          </p>
                          {/* Follow Button */}
                          {userAddress && listing.walletAddress.toLowerCase() !== userAddress.toLowerCase() && (
                            <button
                              onClick={() => toggleFollow(listing.walletAddress)}
                              disabled={followLoading === listing.walletAddress}
                              className={`p-1 rounded transition-all ${
                                followingMap[listing.walletAddress]
                                  ? 'bg-green-900 hover:bg-green-800 text-green-400'
                                  : 'bg-blue-900 hover:bg-blue-800 text-blue-400'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={followingMap[listing.walletAddress] ? 'Unfollow' : 'Follow'}
                            >
                              {followingMap[listing.walletAddress] ? (
                                <UserMinus className="h-3 w-3" />
                              ) : (
                                <UserPlus className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {listing.trackStyle} • {formatDate(listing.listedAt)}
                        </p>
                        
                        <div className="mt-3">
                          <div className="inline-block px-3 py-1 bg-green-900 bg-opacity-50 border border-green-500 rounded-lg">
                            <span className="text-green-400 text-quantum">{listing.price} {listing.currency}</span>
                          </div>
                        </div>
                        
                        {/* Progress bar when playing */}
                        {playingTrack === listing.id && duration > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                            <div 
                              className="w-full bg-gray-800 rounded-full h-2 cursor-pointer hover:h-2.5 transition-all group"
                              onClick={handleSeek}
                              title="Click to seek"
                            >
                              <div 
                                className="bg-gradient-to-r from-orange-600 to-red-600 h-full rounded-full transition-all duration-200 relative"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        {/* Previous button when this track is playing */}
                        {playingTrack === listing.id && (
                          <button
                            onClick={playPrevious}
                            disabled={(filteredShared.length === 0 && filteredListings.findIndex(l => l.id === listing.id) === 0)}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-orange-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous Track"
                          >
                            <SkipBack className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => togglePlayPause(listing.filename, listing.walletAddress, listing.id)}
                          className="p-2 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all glow-orange"
                        >
                          {playingTrack === listing.id && !isPaused ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Next button when this track is playing */}
                        {playingTrack === listing.id && (
                          <button
                            onClick={playNext}
                            disabled={filteredListings.findIndex(l => l.id === listing.id) === filteredListings.length - 1}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-orange-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next Track"
                          >
                            <SkipForward className="h-4 w-4" />
                          </button>
                        )}
                        {/* Show Delete button if owner, Buy button if not */}
                        {userAddress && listing.walletAddress.toLowerCase() === userAddress.toLowerCase() ? (
                          <button
                            onClick={() => deleteListing(listing.id)}
                            className="p-2 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all"
                            title="Remove listing"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => buyTrack(listing)}
                            disabled={buying === listing.id}
                            className="px-3 py-2 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all font-bold text-quantum text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {buying === listing.id ? 'BUYING...' : 'BUY'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

