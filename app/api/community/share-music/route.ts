import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateAndSanitizeText, validateEthereumAddress, checkRateLimit } from '@/lib/security'

const SHARED_MUSIC_FOLDER = 'community_data/shared_music'
const PROFILES_FOLDER = 'community_data/profiles'

interface SharedTrack {
  id: string
  walletAddress: string
  displayName: string
  avatar?: string
  title: string
  style: string
  lyrics?: string
  description: string
  filename: string
  filepath: string
  sharedAt: number
  plays: number
  size: number
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

// POST - Share a track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, displayName, title, style, lyrics, description, filename, filepath, size } = body

    if (!walletAddress || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    // Rate limiting: 10 shares per hour per wallet
    const rateCheck = checkRateLimit(cleanAddress + '_share', 10, 3600000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many shares. Please wait before sharing more tracks.' 
      }, { status: 429 })
    }

    // Sanitize text inputs
    const nameValidation = validateAndSanitizeText(displayName || 'Anonymous', 50, 'Display name')
    const cleanName = nameValidation.sanitized

    const titleValidation = validateAndSanitizeText(title || 'Untitled', 100, 'Title')
    const cleanTitle = titleValidation.sanitized

    const styleValidation = validateAndSanitizeText(style || 'Unknown', 50, 'Style')
    const cleanStyle = styleValidation.sanitized

    const descValidation = validateAndSanitizeText(description || '', 300, 'Description')
    const cleanDesc = descValidation.sanitized

    const lyricsValidation = validateAndSanitizeText(lyrics || '', 2000, 'Lyrics')
    const cleanLyrics = lyricsValidation.sanitized

    // Ensure directories exist
    await fs.mkdir(SHARED_MUSIC_FOLDER, { recursive: true })

    const trackId = `${cleanAddress}_${Date.now()}`
    const sharedTrack: SharedTrack = {
      id: trackId,
      walletAddress: cleanAddress,
      displayName: cleanName,
      title: cleanTitle,
      style: cleanStyle,
      lyrics: cleanLyrics,
      description: cleanDesc,
      filename,
      filepath,
      sharedAt: Date.now(),
      plays: 0,
      size
    }

    const trackPath = path.join(SHARED_MUSIC_FOLDER, `${trackId}.json`)
    await fs.writeFile(trackPath, JSON.stringify(sharedTrack, null, 2))

    // Update user profile stats
    try {
      const profilePath = path.join(PROFILES_FOLDER, `${walletAddress}.json`)
      const profileData = await fs.readFile(profilePath, 'utf-8')
      const profile = JSON.parse(profileData)
      profile.stats.tracksShared = (profile.stats.tracksShared || 0) + 1
      await fs.writeFile(profilePath, JSON.stringify(profile, null, 2))
    } catch (error) {
      console.log('Profile not found, skipping stats update')
    }

    return NextResponse.json({ success: true, track: sharedTrack })
  } catch (error) {
    console.error('Error sharing music:', error)
    return NextResponse.json({ error: 'Failed to share music' }, { status: 500 })
  }
}

// GET - Get shared tracks (all or by user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    await fs.mkdir(SHARED_MUSIC_FOLDER, { recursive: true })
    
    const files = await fs.readdir(SHARED_MUSIC_FOLDER)
    const tracks: SharedTrack[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SHARED_MUSIC_FOLDER, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const track = JSON.parse(data)
        
        // Filter by wallet if specified
        if (!walletAddress || track.walletAddress === walletAddress) {
          tracks.push(track)
        }
      }
    }

    // Sort by shared date (newest first)
    tracks.sort((a, b) => b.sharedAt - a.sharedAt)

    // Enrich tracks with avatars
    const enrichedTracks = await Promise.all(
      tracks.map(async (track) => ({
        ...track,
        avatar: await getUserAvatar(track.walletAddress)
      }))
    )

    return NextResponse.json({ success: true, tracks: enrichedTracks })
  } catch (error) {
    console.error('Error getting shared tracks:', error)
    return NextResponse.json({ error: 'Failed to get shared tracks' }, { status: 500 })
  }
}

// DELETE - Unshare a track
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('id')
    const walletAddress = searchParams.get('address')

    if (!trackId || !walletAddress) {
      return NextResponse.json({ error: 'Track ID and wallet address required' }, { status: 400 })
    }

    const trackPath = path.join(SHARED_MUSIC_FOLDER, `${trackId}.json`)

    // Verify track exists and belongs to user
    try {
      const trackData = await fs.readFile(trackPath, 'utf-8')
      const track = JSON.parse(trackData)

      if (track.walletAddress !== walletAddress) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      await fs.unlink(trackPath)

      // Update user profile stats
      try {
        const profilePath = path.join(PROFILES_FOLDER, `${walletAddress}.json`)
        const profileData = await fs.readFile(profilePath, 'utf-8')
        const profile = JSON.parse(profileData)
        profile.stats.tracksShared = Math.max(0, (profile.stats.tracksShared || 0) - 1)
        await fs.writeFile(profilePath, JSON.stringify(profile, null, 2))
      } catch (error) {
        console.log('Profile not found, skipping stats update')
      }

      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error deleting shared track:', error)
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 })
  }
}

