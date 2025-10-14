import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { validateEthereumAddress } from '@/lib/security'

const WELCOME_CREDITS_FILE = path.join(process.cwd(), 'data', 'welcome_credits.json')
const CREDITS_PER_USER = 1

interface WelcomeCreditData {
  googleUsers: {
    [googleUid: string]: {
      credits: number
      claimed: boolean
      claimedAt: string | null
      lastUsed: string | null
      linkedWallets: string[]
    }
  }
}

// Initialize file if it doesn't exist
async function ensureFileExists() {
  try {
    await fs.access(WELCOME_CREDITS_FILE)
  } catch {
    await fs.mkdir(path.dirname(WELCOME_CREDITS_FILE), { recursive: true })
    await fs.writeFile(WELCOME_CREDITS_FILE, JSON.stringify({ googleUsers: {} }, null, 2))
  }
}

// Read welcome credits data
async function readWelcomeCredits(): Promise<WelcomeCreditData> {
  await ensureFileExists()
  const data = await fs.readFile(WELCOME_CREDITS_FILE, 'utf-8')
  return JSON.parse(data)
}

// Write welcome credits data
async function writeWelcomeCredits(data: WelcomeCreditData) {
  await fs.writeFile(WELCOME_CREDITS_FILE, JSON.stringify(data, null, 2))
}

// GET: Check credits for a Google user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const googleUid = searchParams.get('googleUid')

    if (!googleUid) {
      return NextResponse.json({ error: 'Google UID required' }, { status: 400 })
    }

    const data = await readWelcomeCredits()
    const userData = data.googleUsers[googleUid] || { credits: 0, claimed: false, claimedAt: null }

    return NextResponse.json({
      success: true,
      googleUid,
      credits: userData.credits,
      hasClaimed: userData.claimed,
      claimedAt: userData.claimedAt
    })
  } catch (error) {
    console.error('Error fetching welcome credits:', error)
    return NextResponse.json({ error: 'Failed to fetch welcome credits' }, { status: 500 })
  }
}

// POST: Claim welcome credits (one-time per Google user)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const googleUid = body.googleUid
    const walletAddress = body.wallet?.toLowerCase()

    if (!googleUid || !walletAddress) {
      return NextResponse.json({ error: 'Google UID and wallet address required' }, { status: 400 })
    }

    if (!validateEthereumAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const data = await readWelcomeCredits()

    // Check if already claimed
    if (data.googleUsers[googleUid]?.claimed) {
      return NextResponse.json({
        success: false,
        message: 'Welcome credits already claimed',
        credits: data.googleUsers[googleUid].credits
      })
    }

    // Award welcome credits
    data.googleUsers[googleUid] = {
      credits: CREDITS_PER_USER,
      claimed: true,
      claimedAt: new Date().toISOString(),
      lastUsed: null,
      linkedWallets: [walletAddress]
    }

    await writeWelcomeCredits(data)

    return NextResponse.json({
      success: true,
      message: '🎉 Welcome! You received 1 FREE off-chain credit!',
      credits: CREDITS_PER_USER
    })
  } catch (error) {
    console.error('Error claiming welcome credits:', error)
    return NextResponse.json({ error: 'Failed to claim welcome credits' }, { status: 500 })
  }
}

// PUT: Use welcome credits (deduct when generating music)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const googleUid = body.googleUid
    const amount = body.amount || 1

    if (!googleUid) {
      return NextResponse.json({ error: 'Google UID required' }, { status: 400 })
    }

    const data = await readWelcomeCredits()
    const userData = data.googleUsers[googleUid]

    if (!userData || userData.credits < amount) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    // Deduct credits
    data.googleUsers[googleUid].credits -= amount
    data.googleUsers[googleUid].lastUsed = new Date().toISOString()

    await writeWelcomeCredits(data)

    return NextResponse.json({
      success: true,
      remainingCredits: data.googleUsers[googleUid].credits
    })
  } catch (error) {
    console.error('Error using welcome credits:', error)
    return NextResponse.json({ error: 'Failed to use welcome credits' }, { status: 500 })
  }
}

