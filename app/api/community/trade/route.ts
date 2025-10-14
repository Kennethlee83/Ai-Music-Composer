import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateAndSanitizeText, validateEthereumAddress, validateNumber, checkRateLimit } from '@/lib/security'

const LISTINGS_FOLDER = 'community_data/listings'
const PROFILES_FOLDER = 'community_data/profiles'

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
  buyer?: string
}

// Helper function to get user avatar
async function getUserAvatar(walletAddress: string): Promise<string> {
  try {
    const profilePath = path.join(PROFILES_FOLDER, `${walletAddress}.json`)
    const profileData = await fs.readFile(profilePath, 'utf-8')
    const profile = JSON.parse(profileData)
    return profile.avatar || ''
  } catch {
    return ''
  }
}

// GET - Get active trade listings
export async function GET(request: NextRequest) {
  try {
    await fs.mkdir(LISTINGS_FOLDER, { recursive: true })

    const files = await fs.readdir(LISTINGS_FOLDER)
    const listings: TradeListing[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LISTINGS_FOLDER, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const listing = JSON.parse(data)
        
        // Only return active (not sold) listings
        if (!listing.sold) {
          listings.push(listing)
        }
      }
    }

    // Sort by newest first
    listings.sort((a, b) => b.listedAt - a.listedAt)

    // Enrich listings with avatars
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => ({
        ...listing,
        avatar: await getUserAvatar(listing.walletAddress)
      }))
    )

    return NextResponse.json({ success: true, listings: enrichedListings })
  } catch (error) {
    console.error('Error getting listings:', error)
    return NextResponse.json({ error: 'Failed to get listings' }, { status: 500 })
  }
}

// POST - Create a trade listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, displayName, trackId, trackTitle, trackStyle, filename, price, currency } = body

    if (!walletAddress || !trackId || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    // Rate limiting: 10 listings per 10 minutes per wallet
    const rateCheck = checkRateLimit(cleanAddress + '_listing', 10, 600000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many listings. Please wait before listing more tracks.' 
      }, { status: 429 })
    }

    // Validate price (0.001 to 1000 tokens/BNB)
    const priceValidation = validateNumber(price, 0.001, 1000, 'Price')
    if (!priceValidation.isValid) {
      return NextResponse.json({ error: priceValidation.error }, { status: 400 })
    }
    const validPrice = priceValidation.value.toFixed(6) // Store as string with 6 decimals

    // Sanitize text fields
    const nameValidation = validateAndSanitizeText(displayName || 'Anonymous', 50, 'Display name')
    const cleanName = nameValidation.sanitized

    const titleValidation = validateAndSanitizeText(trackTitle || 'Untitled', 100, 'Track title')
    const cleanTitle = titleValidation.sanitized

    const styleValidation = validateAndSanitizeText(trackStyle || 'Unknown', 50, 'Style')
    const cleanStyle = styleValidation.sanitized

    await fs.mkdir(LISTINGS_FOLDER, { recursive: true })

    const listingId = `${cleanAddress}_${Date.now()}`
    
    const listing: TradeListing = {
      id: listingId,
      trackId,
      walletAddress: cleanAddress,
      displayName: cleanName,
      trackTitle: cleanTitle,
      trackStyle: cleanStyle,
      filename,
      price: validPrice,
      currency: currency || 'WeAD',
      listedAt: Date.now(),
      sold: false
    }

    const listingPath = path.join(LISTINGS_FOLDER, `${listingId}.json`)
    await fs.writeFile(listingPath, JSON.stringify(listing, null, 2))

    return NextResponse.json({ success: true, listing })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}

// PUT - Mark listing as sold
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { listingId, buyer } = body

    if (!listingId || !buyer) {
      return NextResponse.json({ error: 'Listing ID and buyer required' }, { status: 400 })
    }

    const listingPath = path.join(LISTINGS_FOLDER, `${listingId}.json`)
    
    const data = await fs.readFile(listingPath, 'utf-8')
    const listing = JSON.parse(data)
    
    listing.sold = true
    listing.buyer = buyer
    listing.soldAt = Date.now()

    await fs.writeFile(listingPath, JSON.stringify(listing, null, 2))

    return NextResponse.json({ success: true, listing })
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

// DELETE - Remove a listing
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('id')
    const walletAddress = searchParams.get('address')

    if (!listingId || !walletAddress) {
      return NextResponse.json({ error: 'Listing ID and wallet address required' }, { status: 400 })
    }

    const listingPath = path.join(LISTINGS_FOLDER, `${listingId}.json`)
    
    // Verify ownership
    const data = await fs.readFile(listingPath, 'utf-8')
    const listing = JSON.parse(data)

    if (listing.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await fs.unlink(listingPath)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}

