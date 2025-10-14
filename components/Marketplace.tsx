'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Play, Pause, Download, DollarSign } from 'lucide-react'

interface TradeListing {
  id: string
  trackId: string
  walletAddress: string
  displayName: string
  trackTitle: string
  trackStyle: string
  filename: string
  price: string
  currency: 'WeAD' | 'BNB'
  listedAt: number
  sold: boolean
}

interface MarketplaceProps {
  userAddress: string | null
}

export function Marketplace({ userAddress }: MarketplaceProps) {
  const [listings, setListings] = useState<TradeListing[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    loadListings()
    
    // Refresh every 10 seconds
    const interval = setInterval(loadListings, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadListings = async () => {
    try {
      const response = await fetch('/api/community/trade')
      const data = await response.json()
      
      if (data.success) {
        setListings(data.listings)
      }
    } catch (error) {
      console.error('Error loading listings:', error)
    } finally {
      setLoading(false)
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
      
      // Get the provider
      if (typeof window === 'undefined' || !window.ethereum) {
        alert('MetaMask not found')
        return
      }

      const provider = window.ethereum
      
      if (listing.currency === 'BNB') {
        // Direct BNB transfer
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
        
        // Mark as sold
        await fetch('/api/community/trade', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            buyer: userAddress
          })
        })

        // Download the track
        downloadTrack(listing)
        
        alert(`Purchase successful! Transaction: ${txHash}\nYour track is downloading...`)
        loadListings()
        
      } else {
        // WeAD token payment (needs contract integration)
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

  const togglePlayPause = async (listing: TradeListing) => {
    try {
      if (playingTrack === listing.id && audioElement) {
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
      }

      const audio = new Audio(`/api/local-music?filename=${listing.filename}&userAddress=${listing.walletAddress}`)
      audio.preload = 'metadata'
      
      audio.addEventListener('loadeddata', () => {
        audio.play().catch(err => {
          console.error('Play error:', err)
          alert('Failed to play audio')
        })
        setPlayingTrack(listing.id)
        setAudioElement(audio)
        setIsPaused(false)
      })

      audio.addEventListener('ended', () => {
        setPlayingTrack(null)
        setAudioElement(null)
        setIsPaused(false)
      })

      audio.addEventListener('error', () => {
        alert('Failed to load audio')
        setPlayingTrack(null)
        setAudioElement(null)
      })

    } catch (error) {
      console.error('Error playing music:', error)
    }
  }

  const downloadTrack = (listing: TradeListing) => {
    const link = document.createElement('a')
    link.href = `/api/local-music?filename=${listing.filename}&userAddress=${listing.walletAddress}`
    link.download = `${listing.trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center glow-orange">
          <ShoppingCart className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl text-quantum text-green-500">MARKETPLACE</h3>
        <div className="flex-1"></div>
        <div className="px-3 py-1 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
          <span className="text-green-400 text-xs font-bold">{listings.length} FOR SALE</span>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-quantum">No tracks for sale yet</p>
          <p className="text-sm text-gray-500 mt-2">List your tracks to start trading!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-gradient-to-r from-gray-900 to-black border-2 border-green-800 rounded-lg p-4 hover:border-green-500 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <h4 className="font-bold text-green-500 text-quantum text-lg">{listing.trackTitle}</h4>
                  </div>
                  <p className="text-sm text-gray-400">
                    by <span className="text-orange-500 font-semibold">{listing.displayName}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {listing.trackStyle} • Listed: {new Date(listing.listedAt).toLocaleDateString()}
                  </p>
                  
                  <div className="mt-3 flex items-center space-x-3">
                    <div className="px-3 py-1 bg-green-900 bg-opacity-50 border border-green-500 rounded-lg">
                      <span className="text-green-400 font-bold text-lg">{listing.price} {listing.currency}</span>
                    </div>
                    {playingTrack === listing.id && !isPaused && (
                      <span className="text-xs text-orange-500 flex items-center animate-pulse">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-ping"></span>
                        PLAYING
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => togglePlayPause(listing)}
                    className="p-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-110 glow-orange"
                    title={playingTrack === listing.id && !isPaused ? 'Pause' : 'Play Preview'}
                  >
                    {playingTrack === listing.id && !isPaused ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => buyTrack(listing)}
                    disabled={buying === listing.id || (!!userAddress && listing.walletAddress.toLowerCase() === userAddress.toLowerCase())}
                    className="px-4 py-3 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 font-bold text-quantum disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title={userAddress && listing.walletAddress.toLowerCase() === userAddress.toLowerCase() ? 'Your track' : 'Buy track'}
                  >
                    {buying === listing.id ? 'Buying...' : 'BUY NOW'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

