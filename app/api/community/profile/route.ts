import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateAndSanitizeText, validateEthereumAddress, validateURL, checkRateLimit } from '@/lib/security'

const COMMUNITY_DATA_FOLDER = 'community_data/profiles'

interface UserProfile {
  walletAddress: string
  displayName: string
  email?: string
  bio: string
  avatar?: string
  socialLinks?: {
    twitter?: string
    discord?: string
    telegram?: string
  }
  createdAt: number
  stats: {
    tracksShared: number
    totalPlays: number
  }
}

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const profilePath = path.join(COMMUNITY_DATA_FOLDER, `${walletAddress}.json`)

    try {
      const profileData = await fs.readFile(profilePath, 'utf-8')
      const profile = JSON.parse(profileData)
      return NextResponse.json({ success: true, profile })
    } catch {
      // Profile doesn't exist
      return NextResponse.json({ success: false, profile: null })
    }
  } catch (error) {
    console.error('Error getting profile:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

// POST - Create or update profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, displayName, email, bio, avatar, socialLinks } = body

    if (!walletAddress || !displayName) {
      return NextResponse.json({ error: 'Wallet address and display name required' }, { status: 400 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    // Rate limiting: 5 profile updates per 10 minutes per wallet
    const rateCheck = checkRateLimit(cleanAddress + '_profile', 5, 600000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many profile updates. Please wait before updating again.' 
      }, { status: 429 })
    }

    // Validate and sanitize display name
    const nameValidation = validateAndSanitizeText(displayName, 50, 'Display name')
    if (!nameValidation.isValid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 })
    }
    const cleanName = nameValidation.sanitized

    // Sanitize bio (optional)
    const bioValidation = validateAndSanitizeText(bio || '', 500, 'Bio')
    const cleanBio = bioValidation.sanitized

    // Validate email (optional)
    let cleanEmail = ''
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(email)) {
        cleanEmail = email.trim().toLowerCase()
      }
    }

    // Validate social links if provided
    let cleanSocialLinks: { twitter?: string; discord?: string; telegram?: string } = {}
    if (socialLinks) {
      if (socialLinks.twitter) {
        const twitterValidation = validateURL(socialLinks.twitter)
        if (twitterValidation.isValid) {
          cleanSocialLinks.twitter = twitterValidation.sanitized
        }
      }
      if (socialLinks.discord) {
        const discordValidation = validateAndSanitizeText(socialLinks.discord, 50, 'Discord')
        if (discordValidation.isValid) {
          cleanSocialLinks.discord = discordValidation.sanitized
        }
      }
      if (socialLinks.telegram) {
        const telegramValidation = validateAndSanitizeText(socialLinks.telegram, 50, 'Telegram')
        if (telegramValidation.isValid) {
          cleanSocialLinks.telegram = telegramValidation.sanitized
        }
      }
    }

    // Ensure directory exists
    await fs.mkdir(COMMUNITY_DATA_FOLDER, { recursive: true })

    const profilePath = path.join(COMMUNITY_DATA_FOLDER, `${cleanAddress}.json`)

    let profile: UserProfile

    // Check if profile exists
    try {
      const existingData = await fs.readFile(profilePath, 'utf-8')
      const existingProfile = JSON.parse(existingData)
      
      // Update existing profile
      profile = {
        ...existingProfile,
        displayName: cleanName,
        email: cleanEmail || existingProfile.email,
        bio: cleanBio,
        avatar: avatar || existingProfile.avatar,
        socialLinks: cleanSocialLinks
      }
    } catch {
      // Create new profile
      profile = {
        walletAddress: cleanAddress,
        displayName: cleanName,
        email: cleanEmail || '',
        bio: cleanBio,
        avatar: avatar || '',
        socialLinks: cleanSocialLinks,
        createdAt: Date.now(),
        stats: {
          tracksShared: 0,
          totalPlays: 0
        }
      }
    }

    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2))

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}

// GET all profiles
export async function PUT(request: NextRequest) {
  try {
    await fs.mkdir(COMMUNITY_DATA_FOLDER, { recursive: true })
    
    const files = await fs.readdir(COMMUNITY_DATA_FOLDER)
    const profiles: UserProfile[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(COMMUNITY_DATA_FOLDER, file)
        const data = await fs.readFile(filePath, 'utf-8')
        profiles.push(JSON.parse(data))
      }
    }

    return NextResponse.json({ success: true, profiles })
  } catch (error) {
    console.error('Error getting all profiles:', error)
    return NextResponse.json({ error: 'Failed to get profiles' }, { status: 500 })
  }
}

