import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateEthereumAddress, checkRateLimit } from '@/lib/security'

const LIKES_FOLDER = 'community_data/likes'

interface TrackLikes {
  trackId: string
  likes: string[] // Array of wallet addresses who liked
  likeCount: number
}

// GET - Get likes for a track
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    await fs.mkdir(LIKES_FOLDER, { recursive: true })

    const likesPath = path.join(LIKES_FOLDER, `${trackId}.json`)

    try {
      const data = await fs.readFile(likesPath, 'utf-8')
      const likesData = JSON.parse(data)
      return NextResponse.json({ success: true, likes: likesData })
    } catch {
      // No likes yet
      return NextResponse.json({ 
        success: true, 
        likes: { trackId, likes: [], likeCount: 0 }
      })
    }
  } catch (error) {
    console.error('Error getting likes:', error)
    return NextResponse.json({ error: 'Failed to get likes' }, { status: 500 })
  }
}

// POST - Toggle like on a track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackId, walletAddress } = body

    if (!trackId || !walletAddress) {
      return NextResponse.json({ error: 'Track ID and wallet address required' }, { status: 400 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    // Rate limiting: 30 likes per minute per wallet (prevent spam clicking)
    const rateCheck = checkRateLimit(cleanAddress + '_like', 30, 60000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many like requests. Please slow down.' 
      }, { status: 429 })
    }

    await fs.mkdir(LIKES_FOLDER, { recursive: true })

    const likesPath = path.join(LIKES_FOLDER, `${trackId}.json`)
    let likesData: TrackLikes

    // Load existing likes
    try {
      const data = await fs.readFile(likesPath, 'utf-8')
      likesData = JSON.parse(data)
    } catch {
      // Create new likes data
      likesData = {
        trackId,
        likes: [],
        likeCount: 0
      }
    }

    // Toggle like (use cleaned address)
    const likeIndex = likesData.likes.indexOf(cleanAddress)
    if (likeIndex > -1) {
      // Unlike
      likesData.likes.splice(likeIndex, 1)
      likesData.likeCount = likesData.likes.length
    } else {
      // Like
      likesData.likes.push(cleanAddress)
      likesData.likeCount = likesData.likes.length
    }

    // Save
    await fs.writeFile(likesPath, JSON.stringify(likesData, null, 2))

    return NextResponse.json({ 
      success: true, 
      likes: likesData,
      action: likeIndex > -1 ? 'unliked' : 'liked'
    })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}

