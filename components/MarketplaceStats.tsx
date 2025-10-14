'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, BarChart3 } from 'lucide-react'

interface Stats {
  totalRevenue: number
  totalSpending: number
  netProfit: number
  songsSold: number
  songsPurchased: number
  activeListing: number
  recentSales: Array<{
    trackTitle: string
    price: string
    soldAt: number
    buyer: string
  }>
  recentPurchases: Array<{
    trackTitle: string
    price: string
    soldAt: number
    seller: string
  }>
}

export function MarketplaceStats() {
  const { t } = useTranslation()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    checkWallet()
    
    // Listen for wallet connection/disconnection events
    const handleWalletDisconnected = () => {
      setWalletAddress(null)
      setStats(null)
      setLoading(false)
    }

    const handleWalletConnected = (event: any) => {
      const address = event.detail?.address
      if (address) {
        setWalletAddress(address)
        loadStatsForAddress(address)
      }
    }

    window.addEventListener('walletConnected', handleWalletConnected)
    window.addEventListener('walletDisconnected', handleWalletDisconnected)

    // Fallback timeout
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('walletConnected', handleWalletConnected)
      window.removeEventListener('walletDisconnected', handleWalletDisconnected)
    }
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadStats()
    }
  }, [walletAddress])

  const checkWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setLoading(false)
      return
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0])
        loadStatsForAddress(accounts[0])
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking wallet:', error)
      setLoading(false)
    }
  }

  const loadStatsForAddress = async (address: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/marketplace/stats?address=${address}`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading marketplace stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!walletAddress) return
    loadStatsForAddress(walletAddress)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}d ago`
    return date.toLocaleDateString()
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!walletAddress) {
    return (
      <div className="card-quantum">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl text-quantum text-orange-500">
            MARKETPLACE STATS
          </h3>
        </div>
        
        <div className="text-center py-4">
          <DollarSign className="h-10 w-10 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-400 text-quantum">Connect wallet to view stats</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-xs text-gray-400 mt-2 text-quantum">Loading stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl text-quantum text-orange-500">
            MARKETPLACE STATS
          </h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-0.5 bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg hover:bg-orange-800 transition-all"
        >
          <span className="text-orange-400 text-xs font-bold">
            {expanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-900 to-emerald-900 border-2 border-green-500 rounded-lg p-2">
          <div className="flex items-center space-x-1 mb-0.5">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="text-[10px] text-green-400 font-bold">REVENUE</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.totalRevenue.toFixed(4) || '0.0000'}</p>
          <p className="text-[10px] text-gray-400">BNB Earned</p>
        </div>

        {/* Total Spending */}
        <div className="bg-gradient-to-br from-red-900 to-orange-900 border-2 border-red-500 rounded-lg p-2">
          <div className="flex items-center space-x-1 mb-0.5">
            <TrendingDown className="h-3 w-3 text-red-400" />
            <span className="text-[10px] text-red-400 font-bold">SPENDING</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.totalSpending.toFixed(4) || '0.0000'}</p>
          <p className="text-[10px] text-gray-400">BNB Spent</p>
        </div>

        {/* Net Profit */}
        <div className={`bg-gradient-to-br ${(stats?.netProfit || 0) >= 0 ? 'from-blue-900 to-cyan-900 border-blue-500' : 'from-red-900 to-pink-900 border-red-500'} border-2 rounded-lg p-2`}>
          <div className="flex items-center space-x-1 mb-0.5">
            <DollarSign className={`h-3 w-3 ${(stats?.netProfit || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
            <span className={`text-[10px] font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              NET {(stats?.netProfit || 0) >= 0 ? 'PROFIT' : 'LOSS'}
            </span>
          </div>
          <p className={`text-lg font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(stats?.netProfit || 0) >= 0 ? '+' : ''}{stats?.netProfit.toFixed(4) || '0.0000'}
          </p>
          <p className="text-[10px] text-gray-400">BNB Balance</p>
        </div>

        {/* Songs Sold */}
        <div className="bg-gray-900 bg-opacity-50 border-2 border-yellow-500 rounded-lg p-2">
          <div className="flex items-center space-x-1 mb-0.5">
            <Package className="h-3 w-3 text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-bold">SOLD</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.songsSold || 0}</p>
          <p className="text-[10px] text-gray-400">Tracks</p>
        </div>

        {/* Songs Purchased */}
        <div className="bg-gray-900 bg-opacity-50 border-2 border-orange-500 rounded-lg p-2">
          <div className="flex items-center space-x-1 mb-0.5">
            <ShoppingCart className="h-3 w-3 text-orange-400" />
            <span className="text-[10px] text-orange-400 font-bold">BOUGHT</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.songsPurchased || 0}</p>
          <p className="text-[10px] text-gray-400">Tracks</p>
        </div>

        {/* Active Listings */}
        <div className="bg-gray-900 bg-opacity-50 border-2 border-cyan-500 rounded-lg p-2">
          <div className="flex items-center space-x-1 mb-0.5">
            <BarChart3 className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] text-cyan-400 font-bold">ACTIVE</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.activeListing || 0}</p>
          <p className="text-[10px] text-gray-400">Listings</p>
        </div>
      </div>

      {/* Expanded Section - Recent Transactions */}
      {expanded && (
        <div className="space-y-2 mt-2 border-t-2 border-gray-800 pt-2">
          {/* Recent Sales */}
          {stats && stats.recentSales.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-green-400 mb-1">🎵 RECENT SALES</h4>
              <div className="space-y-1">
                {stats.recentSales.map((sale, idx) => (
                  <div key={idx} className="bg-green-900 bg-opacity-20 border border-green-700 rounded p-1.5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs text-white font-semibold truncate">{sale.trackTitle}</p>
                        <p className="text-[10px] text-gray-400">Buyer: {shortenAddress(sale.buyer)}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-green-400">+{parseFloat(sale.price).toFixed(4)} BNB</p>
                        <p className="text-[10px] text-gray-500">{formatTime(sale.soldAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Purchases */}
          {stats && stats.recentPurchases.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-orange-400 mb-1">🛒 RECENT PURCHASES</h4>
              <div className="space-y-1">
                {stats.recentPurchases.map((purchase, idx) => (
                  <div key={idx} className="bg-orange-900 bg-opacity-20 border border-orange-700 rounded p-1.5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs text-white font-semibold truncate">{purchase.trackTitle}</p>
                        <p className="text-[10px] text-gray-400">Seller: {shortenAddress(purchase.seller)}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-orange-400">-{parseFloat(purchase.price).toFixed(4)} BNB</p>
                        <p className="text-[10px] text-gray-500">{formatTime(purchase.soldAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No transactions yet */}
          {stats && stats.recentSales.length === 0 && stats.recentPurchases.length === 0 && (
            <div className="text-center py-3">
              <Package className="h-8 w-8 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-400">No transactions yet</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Start selling or buying music in the marketplace!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

