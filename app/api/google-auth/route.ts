import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { validateEthereumAddress } from '@/lib/security'

const GOOGLE_USERS_FILE = path.join(process.cwd(), 'data', 'google_users.json')

interface GoogleUserData {
  [googleUid: string]: {
    email: string
    displayName: string
    linkedWallets: string[]
    firstLoginAt: number
    lastLoginAt: number
  }
}

async function readGoogleUsers(): Promise<GoogleUserData> {
  try {
    const data = await fs.readFile(GOOGLE_USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(GOOGLE_USERS_FILE), { recursive: true })
      await fs.writeFile(GOOGLE_USERS_FILE, JSON.stringify({}), 'utf-8')
      return {}
    }
    console.error('Error reading Google users file:', error)
    return {}
  }
}

async function writeGoogleUsers(data: GoogleUserData): Promise<void> {
  await fs.writeFile(GOOGLE_USERS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// Verify Google ID token (basic verification without Firebase Admin SDK)
async function verifyGoogleToken(idToken: string): Promise<any> {
  try {
    // Decode JWT token (basic validation)
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }

    // Verify issuer
    if (payload.iss !== 'https://securetoken.google.com/wead-weadvertise' && 
        payload.iss !== 'https://accounts.google.com') {
      throw new Error('Invalid issuer')
    }

    return payload
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

// POST: Link Google account with wallet
export async function POST(request: NextRequest) {
  try {
    const { idToken, walletAddress } = await request.json()

    if (!idToken || !walletAddress || !validateEthereumAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 })
    }

    // Verify Google ID token
    const payload = await verifyGoogleToken(idToken)
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, error: 'Invalid Google token' }, { status: 401 })
    }

    const googleUid = payload.sub
    const email = payload.email || 'unknown'
    const displayName = payload.name || 'User'
    const normalizedWallet = walletAddress.toLowerCase()

    const googleUsers = await readGoogleUsers()
    const now = Date.now()

    if (googleUsers[googleUid]) {
      // Existing Google user - link new wallet if not already linked
      if (!googleUsers[googleUid].linkedWallets.includes(normalizedWallet)) {
        googleUsers[googleUid].linkedWallets.push(normalizedWallet)
      }
      googleUsers[googleUid].lastLoginAt = now
    } else {
      // New Google user
      googleUsers[googleUid] = {
        email,
        displayName,
        linkedWallets: [normalizedWallet],
        firstLoginAt: now,
        lastLoginAt: now
      }
    }

    await writeGoogleUsers(googleUsers)

    return NextResponse.json({
      success: true,
      googleUser: {
        uid: googleUid,
        email,
        displayName,
        linkedWallets: googleUsers[googleUid].linkedWallets,
        isNewUser: googleUsers[googleUid].firstLoginAt === now
      }
    })
  } catch (error) {
    console.error('API Error (POST /api/google-auth):', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Check if wallet is linked to a Google account
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('wallet')

    if (!walletAddress || !validateEthereumAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }

    const normalizedWallet = walletAddress.toLowerCase()
    const googleUsers = await readGoogleUsers()

    // Find Google account linked to this wallet
    const linkedGoogleUser = Object.entries(googleUsers).find(([_, userData]) =>
      userData.linkedWallets.includes(normalizedWallet)
    )

    if (linkedGoogleUser) {
      const [googleUid, userData] = linkedGoogleUser
      return NextResponse.json({
        success: true,
        isLinked: true,
        googleUser: {
          uid: googleUid,
          email: userData.email,
          displayName: userData.displayName
        }
      })
    }

    return NextResponse.json({
      success: true,
      isLinked: false
    })
  } catch (error) {
    console.error('API Error (GET /api/google-auth):', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

