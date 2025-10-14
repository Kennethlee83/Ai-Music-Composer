import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const USERS_FOLDER = 'data/users'
const IP_TRACKING_FILE = 'data/ip_free_credits.json'

// Get real IP address (even through VPN/proxy)
function getRealIP(request: NextRequest): string {
  // Try multiple headers to get real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip') // Cloudflare
  
  if (cfConnecting) return cfConnecting
  if (realIP) return realIP
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  
  // Fallback to Next.js IP
  return request.ip || 'unknown'
}

interface UserData {
  username: string
  passwordHash: string
  email?: string
  bio: string
  avatar?: string
  walletAddress?: string
  socialLinks?: {
    twitter?: string
    discord?: string
    telegram?: string
  }
  createdAt: number
  freeCredits: number
  stats: {
    tracksShared: number
    totalPlays: number
  }
}

// Simple password hashing (you can upgrade to bcrypt later)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, email, bio, avatar, walletAddress, socialLinks } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Get real IP address
    const userIP = getRealIP(request)
    console.log('📍 Registration from IP:', userIP)

    // Ensure directory exists
    await fs.mkdir(USERS_FOLDER, { recursive: true })
    await fs.mkdir(path.dirname(IP_TRACKING_FILE), { recursive: true })

    // Check if username already exists
    const userFile = path.join(USERS_FOLDER, `${username.toLowerCase()}.json`)
    try {
      await fs.access(userFile)
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    } catch {
      // User doesn't exist, continue
    }

    // Check IP tracking for free credits
    let ipData: { [ip: string]: { claimed: boolean; claimedAt: string; username: string } } = {}
    try {
      const ipFileData = await fs.readFile(IP_TRACKING_FILE, 'utf-8')
      ipData = JSON.parse(ipFileData)
    } catch {
      // File doesn't exist, create it
    }

    // Check if this IP already claimed free credit
    const ipHasCredit = ipData[userIP]?.claimed || false
    const freeCreditsToGrant = ipHasCredit ? 0 : 1

    // Create new user
    const userData: UserData = {
      username: username.trim(),
      passwordHash: hashPassword(password),
      email: email?.trim() || '',
      bio: bio?.trim() || '',
      avatar: avatar || '',
      walletAddress: walletAddress || '',
      socialLinks: socialLinks || {},
      createdAt: Date.now(),
      freeCredits: freeCreditsToGrant, // 1 FREE CREDIT ONLY IF IP HASN'T CLAIMED!
      stats: {
        tracksShared: 0,
        totalPlays: 0
      }
    }

    await fs.writeFile(userFile, JSON.stringify(userData, null, 2))

    // If free credit was granted, track this IP
    if (freeCreditsToGrant > 0) {
      ipData[userIP] = {
        claimed: true,
        claimedAt: new Date().toISOString(),
        username: username.trim()
      }
      await fs.writeFile(IP_TRACKING_FILE, JSON.stringify(ipData, null, 2))
      console.log(`✅ Free credit granted to IP ${userIP} (user: ${username})`)
    } else {
      console.log(`⚠️ IP ${userIP} already claimed free credit (previous user: ${ipData[userIP]?.username})`)
    }

    // Return profile (without password hash)
    const { passwordHash, ...profile } = userData

    return NextResponse.json({ 
      success: true, 
      profile,
      freeCredits: freeCreditsToGrant,
      message: freeCreditsToGrant > 0 
        ? '🎉 Registration successful! You received 1 FREE credit!' 
        : '✅ Registration successful! (Note: Free credit already claimed from this network)'
    })
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}

