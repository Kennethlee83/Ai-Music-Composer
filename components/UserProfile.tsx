'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Wallet, Music, Calendar, TrendingUp, AlertTriangle, Trophy, BarChart3 } from 'lucide-react'

interface LocalMusicFile {
  filename: string
  filepath: string
  title: string
  style: string
  lyrics?: string
  timestamp: number
  size: number
}

interface GenreStats {
  [key: string]: number
}

export function UserProfile() {
  const { t } = useTranslation()
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [musicFiles, setMusicFiles] = useState<LocalMusicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [weadBalance, setWeadBalance] = useState<string>('0')
  const [bnbBalance, setBnbBalance] = useState<string>('0')
  const [totalSpent, setTotalSpent] = useState<string>('0')
  
  // Stats
  const [totalTracks, setTotalTracks] = useState(0)
  const [memberSince, setMemberSince] = useState<string>('')
  const [favoriteGenre, setFavoriteGenre] = useState<string>('N/A')
  const [totalStorageUsed, setTotalStorageUsed] = useState<string>('0 MB')
  const [genreStats, setGenreStats] = useState<GenreStats>({})
  
  // Expiry warnings
  const [expiringIn12Hours, setExpiringIn12Hours] = useState(0)
  const [expiringIn36Hours, setExpiringIn36Hours] = useState(0)
  const [safeTracks, setSafeTracks] = useState(0)

  const EXPIRY_TIME = 48 * 60 * 60 * 1000 // 48 hours

  useEffect(() => {
    checkWallet()
    
    // Note: We rely on custom events from SimpleWallet component
    // instead of directly listening to MetaMask to avoid conflicts
    
    // Listen for custom wallet disconnect event
    const handleWalletDisconnect = () => {
      setUserAddress(null)
      setMusicFiles([])
      setLoading(false)
      setTotalTracks(0)
      setMemberSince('')
      setFavoriteGenre('N/A')
      setTotalStorageUsed('0 MB')
      setGenreStats({})
      setBnbBalance('0')
      setWeadBalance('0')
    }
    
    // Listen for custom wallet connect event
    const handleWalletConnect = (event: any) => {
      const address = event.detail?.address
      if (address) {
        setUserAddress(address)
        getBalances(address)
      }
    }
    
    window.addEventListener('walletDisconnected', handleWalletDisconnect)
    window.addEventListener('walletConnected', handleWalletConnect)
    
    // Fallback timeout - stop loading after 3 seconds if nothing happens
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)
    
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('walletDisconnected', handleWalletDisconnect)
      window.removeEventListener('walletConnected', handleWalletConnect)
    }
  }, [])

  useEffect(() => {
    if (userAddress) {
      // Reset loading state and reload data when wallet connects
      setLoading(true)
      loadUserData()
    } else {
      // Clear data when no wallet
      setMusicFiles([])
      setTotalTracks(0)
      setMemberSince('')
      setFavoriteGenre('N/A')
      setTotalStorageUsed('0 MB')
      setGenreStats({})
      setBnbBalance('0')
      setWeadBalance('0')
    }
  }, [userAddress])

  const checkWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setUserAddress(accounts[0])
          await getBalances(accounts[0])
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking wallet:', error)
      setLoading(false)
    }
  }

  const getBalances = async (address: string) => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Get BNB balance
        const balanceHex = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
        const balanceBnb = (parseInt(balanceHex, 16) / 1e18).toFixed(6)
        setBnbBalance(balanceBnb)

        // TODO: Get WeAD token balance from contract
        // For now, showing placeholder
        setWeadBalance('0')
      }
    } catch (error) {
      console.error('Error getting balances:', error)
    } finally {
      // Ensure loading stops even if balance fetch fails
      if (!userAddress) {
        setLoading(false)
      }
    }
  }

  const loadUserData = async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      
      // Load music files
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/local-music?userAddress=${userAddress}&t=${timestamp}`)
      const data = await response.json()
      
      if (data.success) {
        const files = data.files as LocalMusicFile[]
        setMusicFiles(files)
        
        // Calculate statistics
        calculateStats(files)
        calculateExpiryWarnings(files)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (files: LocalMusicFile[]) => {
    if (files.length === 0) {
      setTotalTracks(0)
      setMemberSince('N/A')
      setFavoriteGenre('N/A')
      setTotalStorageUsed('0 MB')
      setGenreStats({})
      return
    }

    // Total tracks
    setTotalTracks(files.length)

    // Member since (oldest file timestamp)
    const oldestTimestamp = Math.min(...files.map(f => f.timestamp))
    const memberDate = new Date(oldestTimestamp)
    setMemberSince(memberDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))

    // Total storage used
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2)
    setTotalStorageUsed(`${totalMB} MB`)

    // Genre statistics
    const genres: GenreStats = {}
    files.forEach(file => {
      const genre = file.style || 'Unknown'
      genres[genre] = (genres[genre] || 0) + 1
    })
    setGenreStats(genres)

    // Favorite genre (most used)
    if (Object.keys(genres).length > 0) {
      const favorite = Object.entries(genres).sort((a, b) => b[1] - a[1])[0][0]
      setFavoriteGenre(favorite)
    }
  }

  const calculateExpiryWarnings = (files: LocalMusicFile[]) => {
    const now = Date.now()
    let expiring12 = 0
    let expiring36 = 0
    let safe = 0

    files.forEach(file => {
      const age = now - file.timestamp
      const timeRemaining = EXPIRY_TIME - age

      if (timeRemaining <= 12 * 60 * 60 * 1000) { // 12 hours
        expiring12++
      } else if (timeRemaining <= 36 * 60 * 60 * 1000) { // 36 hours
        expiring36++
      } else {
        safe++
      }
    })

    setExpiringIn12Hours(expiring12)
    setExpiringIn36Hours(expiring36)
    setSafeTracks(safe)
  }


  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!userAddress) {
    return (
      <div className="card-quantum">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <User className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl text-quantum text-orange-500">{t('profile.userProfile')}</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center glow-orange mx-auto mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-400 text-quantum text-lg mb-2">Connect Your Wallet</p>
          <p className="text-sm text-gray-500">Connect your wallet to view your profile and statistics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card-quantum">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <User className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl text-quantum text-orange-500">{t('profile.userProfile')}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <Music className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-gray-400 text-quantum">{t('profile.tracksLabel')}</span>
            </div>
            <p className="text-2xl font-bold text-orange-500 text-quantum">{totalTracks}</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-gray-400 text-quantum">{t('profile.member')}</span>
            </div>
            <p className="text-sm font-bold text-orange-500 text-quantum">{memberSince}</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-gray-400 text-quantum">{t('profile.favorite')}</span>
            </div>
            <p className="text-xs font-bold text-orange-500 text-quantum truncate">{favoriteGenre}</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-gray-400 text-quantum">{t('profile.storage')}</span>
            </div>
            <p className="text-sm font-bold text-orange-500 text-quantum">{totalStorageUsed}</p>
          </div>
        </div>
      </div>

      {/* Storage Warning - Moved up for better alignment */}
      {totalTracks > 0 && (expiringIn12Hours > 0 || expiringIn36Hours > 0) && (
        <div className="card-quantum border-2 border-orange-500">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500 animate-pulse" />
            <h4 className="text-lg font-bold text-quantum text-orange-500">{t('profile.storageWarnings')}</h4>
          </div>
          
          <div className="space-y-2">
            {expiringIn12Hours > 0 && (
              <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm font-bold">
                  ⚠️ {expiringIn12Hours} {t('profile.tracksExpiringLess12')}
                </p>
              </div>
            )}
            
            {expiringIn36Hours > 0 && (
              <div className="bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg p-3">
                <p className="text-orange-400 text-sm font-bold">
                  ⏰ {expiringIn36Hours} {t('profile.tracksExpiringLess36')}
                </p>
              </div>
            )}
            
            {safeTracks > 0 && (
              <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-3">
                <p className="text-green-400 text-sm font-bold">
                  ✅ {safeTracks} track{safeTracks > 1 ? 's' : ''} safe (recently created)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet & Balance Card */}
      <div className="card-quantum">
        <div className="flex items-center space-x-2 mb-4">
          <Wallet className="h-5 w-5 text-orange-500" />
          <h4 className="text-lg font-bold text-quantum text-orange-500">{t('profile.walletBalance')}</h4>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-3">
            <span className="text-sm text-gray-400 text-quantum">{t('profile.walletAddress')}</span>
            <span className="text-sm text-orange-500 font-mono font-bold">{formatAddress(userAddress)}</span>
          </div>
          
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-3">
            <span className="text-sm text-gray-400 text-quantum">{t('profile.bnbBalance')}</span>
            <span className="text-sm text-orange-500 font-bold">{bnbBalance} BNB</span>
          </div>
          
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-3">
            <span className="text-sm text-gray-400 text-quantum">{t('profile.weadBalance')}</span>
            <span className="text-sm text-orange-500 font-bold">{weadBalance} WeAD</span>
          </div>
          
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-3">
            <span className="text-sm text-gray-400 text-quantum">{t('profile.network')}</span>
            <span className="text-sm text-green-500 font-bold">{t('profile.bscMainnet')}</span>
          </div>
        </div>
      </div>

      {/* Genre Statistics */}
      {Object.keys(genreStats).length > 0 && (
        <div className="card-quantum">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h4 className="text-lg font-bold text-quantum text-orange-500">{t('profile.musicStyles')}</h4>
          </div>
          
          <div className="space-y-3">
            {Object.entries(genreStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([genre, count]) => {
                const percentage = (count / totalTracks) * 100
                return (
                  <div key={genre}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400 text-quantum truncate">{genre}</span>
                      <span className="text-orange-500 font-bold">{count} {t('musicLibrary.tracksCount')}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

    </div>
  )
}

