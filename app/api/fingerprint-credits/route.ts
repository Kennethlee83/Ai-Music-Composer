import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const FINGERPRINT_FILE = 'data/fingerprint_credits.json'
const PROFILES_FOLDER = 'data/users'

interface FingerprintData {
  [fingerprint: string]: {
    walletAddress: string
    offChainCredits: number
    onChainCreditsGranted: boolean
    claimedAt: string
    lastUsed: string | null
    displayName?: string
    avatar?: string
  }
}

// GET - Check fingerprint and get credits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')
    const walletAddress = searchParams.get('wallet')?.toLowerCase()

    if (!fingerprint || !walletAddress) {
      return NextResponse.json({ error: 'Fingerprint and wallet required' }, { status: 400 })
    }

    // Ensure data directory exists
    await fs.mkdir('data', { recursive: true })
    await fs.mkdir(PROFILES_FOLDER, { recursive: true })

    // Read existing fingerprint data
    let fpData: FingerprintData = {}
    try {
      const data = await fs.readFile(FINGERPRINT_FILE, 'utf-8')
      fpData = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }

    // Check if fingerprint exists
    const existingData = fpData[fingerprint]
    
    if (existingData) {
      // Existing user - return their credits
      return NextResponse.json({
        success: true,
        isNewUser: false,
        offChainCredits: existingData.offChainCredits,
        onChainCreditsGranted: existingData.onChainCreditsGranted,
        profile: {
          displayName: existingData.displayName || 'Anonymous',
          avatar: existingData.avatar || ''
        }
      })
    } else {
      // NEW USER - Grant welcome credits!
      const newUserData = {
        walletAddress,
        offChainCredits: 1, // 1 FREE OFF-CHAIN CREDIT
        onChainCreditsGranted: true, // Flag to grant 1 ON-CHAIN credit via smart contract
        claimedAt: new Date().toISOString(),
        lastUsed: null,
        displayName: 'Anonymous',
        avatar: ''
      }

      fpData[fingerprint] = newUserData
      await fs.writeFile(FINGERPRINT_FILE, JSON.stringify(fpData, null, 2))

      console.log(`🎉 NEW USER! Fingerprint: ${fingerprint.substring(0, 16)}... | Wallet: ${walletAddress}`)
      console.log(`💎 Granted: 1 OFF-CHAIN credit + 1 ON-CHAIN credit`)

      return NextResponse.json({
        success: true,
        isNewUser: true,
        offChainCredits: 1,
        onChainCreditsGranted: true,
        message: '🎉 Welcome! You received 1 FREE Off-Chain credit + 1 On-Chain credit!',
        profile: {
          displayName: 'Anonymous',
          avatar: ''
        }
      })
    }
  } catch (error) {
    console.error('Error checking fingerprint:', error)
    return NextResponse.json({ error: 'Failed to check fingerprint' }, { status: 500 })
  }
}

// PUT - Use off-chain credit
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint, amount } = body

    if (!fingerprint || !amount) {
      return NextResponse.json({ error: 'Fingerprint and amount required' }, { status: 400 })
    }

    let fpData: FingerprintData = {}
    try {
      const data = await fs.readFile(FINGERPRINT_FILE, 'utf-8')
      fpData = JSON.parse(data)
    } catch {
      return NextResponse.json({ error: 'No credits found' }, { status: 404 })
    }

    const userData = fpData[fingerprint]
    if (!userData) {
      return NextResponse.json({ error: 'Fingerprint not found' }, { status: 404 })
    }

    if (userData.offChainCredits < amount) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    // Deduct credits
    userData.offChainCredits -= amount
    userData.lastUsed = new Date().toISOString()
    fpData[fingerprint] = userData

    await fs.writeFile(FINGERPRINT_FILE, JSON.stringify(fpData, null, 2))

    console.log(`✅ OFF-CHAIN credit used | Fingerprint: ${fingerprint.substring(0, 16)}... | Remaining: ${userData.offChainCredits}`)

    return NextResponse.json({
      success: true,
      remainingCredits: userData.offChainCredits
    })
  } catch (error) {
    console.error('Error using credit:', error)
    return NextResponse.json({ error: 'Failed to use credit' }, { status: 500 })
  }
}

// POST - Update profile (display name, avatar)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint, displayName, avatar } = body

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 })
    }

    let fpData: FingerprintData = {}
    try {
      const data = await fs.readFile(FINGERPRINT_FILE, 'utf-8')
      fpData = JSON.parse(data)
    } catch {
      return NextResponse.json({ error: 'Fingerprint not found' }, { status: 404 })
    }

    const userData = fpData[fingerprint]
    if (!userData) {
      return NextResponse.json({ error: 'Fingerprint not found' }, { status: 404 })
    }

    // Update profile
    if (displayName) userData.displayName = displayName.trim()
    if (avatar !== undefined) userData.avatar = avatar

    fpData[fingerprint] = userData
    await fs.writeFile(FINGERPRINT_FILE, JSON.stringify(fpData, null, 2))

    return NextResponse.json({
      success: true,
      profile: {
        displayName: userData.displayName,
        avatar: userData.avatar
      }
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

