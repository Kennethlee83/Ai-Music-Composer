import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const LISTINGS_FOLDER = 'community_data/listings'

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
  buyer?: string
  soldAt?: number
}

interface MarketplaceStats {
  totalRevenue: number // Total BNB earned from sales
  totalSpending: number // Total BNB spent on purchases
  netProfit: number // Revenue - Spending
  songsSold: number // Number of songs sold
  songsPurchased: number // Number of songs purchased
  activeListing: number // Current listings for sale
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const cleanAddress = walletAddress.toLowerCase()

    await fs.mkdir(LISTINGS_FOLDER, { recursive: true })

    const files = await fs.readdir(LISTINGS_FOLDER)
    const listings: TradeListing[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LISTINGS_FOLDER, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const listing = JSON.parse(data)
        listings.push(listing)
      }
    }

    // Calculate stats
    let totalRevenue = 0
    let totalSpending = 0
    let songsSold = 0
    let songsPurchased = 0
    let activeListings = 0
    const recentSales: MarketplaceStats['recentSales'] = []
    const recentPurchases: MarketplaceStats['recentPurchases'] = []

    for (const listing of listings) {
      const isSeller = listing.walletAddress.toLowerCase() === cleanAddress
      const isBuyer = listing.buyer?.toLowerCase() === cleanAddress

      // Revenue from sales
      if (isSeller && listing.sold && listing.currency === 'BNB') {
        totalRevenue += parseFloat(listing.price)
        songsSold++
        recentSales.push({
          trackTitle: listing.trackTitle,
          price: listing.price,
          soldAt: listing.soldAt || listing.listedAt,
          buyer: listing.buyer || 'Unknown'
        })
      }

      // Spending on purchases
      if (isBuyer && listing.currency === 'BNB') {
        totalSpending += parseFloat(listing.price)
        songsPurchased++
        recentPurchases.push({
          trackTitle: listing.trackTitle,
          price: listing.price,
          soldAt: listing.soldAt || listing.listedAt,
          seller: listing.walletAddress
        })
      }

      // Active listings
      if (isSeller && !listing.sold) {
        activeListings++
      }
    }

    // Sort recent transactions by date (newest first)
    recentSales.sort((a, b) => b.soldAt - a.soldAt)
    recentPurchases.sort((a, b) => b.soldAt - a.soldAt)

    // Limit to 5 most recent
    const limitedSales = recentSales.slice(0, 5)
    const limitedPurchases = recentPurchases.slice(0, 5)

    const stats: MarketplaceStats = {
      totalRevenue,
      totalSpending,
      netProfit: totalRevenue - totalSpending,
      songsSold,
      songsPurchased,
      activeListing: activeListings,
      recentSales: limitedSales,
      recentPurchases: limitedPurchases
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('Error getting marketplace stats:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}

