import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateEthereumAddress, checkRateLimit } from '@/lib/security'

const FOLLOWS_FOLDER = 'community_data/follows'
const FOLLOWS_FILE = 'community_data/follows/relationships.json'

interface FollowData {
  [walletAddress: string]: {
    following: string[]    // Addresses this user follows
    followers: string[]    // Addresses that follow this user
    lastUpdated: number
  }
}

// Helper: Load all follow data
async function loadFollowData(): Promise<FollowData> {
  try {
    await fs.mkdir(FOLLOWS_FOLDER, { recursive: true })
    const data = await fs.readFile(FOLLOWS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

// Helper: Save follow data
async function saveFollowData(data: FollowData): Promise<void> {
  await fs.mkdir(FOLLOWS_FOLDER, { recursive: true })
  await fs.writeFile(FOLLOWS_FILE, JSON.stringify(data, null, 2))
}

// Helper: Get follow stats for a user
function getFollowStats(data: FollowData, address: string) {
  const userFollow = data[address] || { following: [], followers: [], lastUpdated: Date.now() }
  return {
    followingCount: userFollow.following.length,
    followersCount: userFollow.followers.length,
    following: userFollow.following,
    followers: userFollow.followers
  }
}

// GET - Get follow stats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const targetAddress = searchParams.get('target') // Check if user follows target

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Validate address
    const addressValidation = validateEthereumAddress(address)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    const data = await loadFollowData()
    const stats = getFollowStats(data, cleanAddress)

    // Check if user follows target
    let isFollowing = false
    if (targetAddress) {
      const targetValidation = validateEthereumAddress(targetAddress)
      if (targetValidation.isValid) {
        isFollowing = stats.following.includes(targetValidation.sanitized)
      }
    }

    return NextResponse.json({
      success: true,
      followingCount: stats.followingCount,
      followersCount: stats.followersCount,
      following: stats.following,
      followers: stats.followers,
      isFollowing
    })
  } catch (error) {
    console.error('Error getting follow stats:', error)
    return NextResponse.json({ error: 'Failed to get follow stats' }, { status: 500 })
  }
}

// POST - Follow or unfollow a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followerAddress, targetAddress, action } = body

    if (!followerAddress || !targetAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'Invalid action. Must be "follow" or "unfollow"' }, { status: 400 })
    }

    // Validate addresses
    const followerValidation = validateEthereumAddress(followerAddress)
    const targetValidation = validateEthereumAddress(targetAddress)

    if (!followerValidation.isValid || !targetValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }

    const cleanFollower = followerValidation.sanitized
    const cleanTarget = targetValidation.sanitized

    // Can't follow yourself
    if (cleanFollower.toLowerCase() === cleanTarget.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Rate limiting: 50 actions per hour per user
    const rateCheck = checkRateLimit(cleanFollower + '_follow', 50, 3600000)
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Too many follow/unfollow actions. Please wait before trying again.'
      }, { status: 429 })
    }

    // Load current data
    const data = await loadFollowData()

    // Initialize user data if not exists
    if (!data[cleanFollower]) {
      data[cleanFollower] = { following: [], followers: [], lastUpdated: Date.now() }
    }
    if (!data[cleanTarget]) {
      data[cleanTarget] = { following: [], followers: [], lastUpdated: Date.now() }
    }

    if (action === 'follow') {
      // Check if already following
      if (data[cleanFollower].following.includes(cleanTarget)) {
        return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
      }

      // Add to following list
      data[cleanFollower].following.push(cleanTarget)
      data[cleanFollower].lastUpdated = Date.now()

      // Add to target's followers list
      data[cleanTarget].followers.push(cleanFollower)
      data[cleanTarget].lastUpdated = Date.now()

      await saveFollowData(data)

      return NextResponse.json({
        success: true,
        message: 'Successfully followed user',
        followingCount: data[cleanFollower].following.length,
        followersCount: data[cleanFollower].followers.length
      })
    } else {
      // Unfollow
      // Check if actually following
      if (!data[cleanFollower].following.includes(cleanTarget)) {
        return NextResponse.json({ error: 'Not following this user' }, { status: 400 })
      }

      // Remove from following list
      data[cleanFollower].following = data[cleanFollower].following.filter(addr => addr !== cleanTarget)
      data[cleanFollower].lastUpdated = Date.now()

      // Remove from target's followers list
      data[cleanTarget].followers = data[cleanTarget].followers.filter(addr => addr !== cleanFollower)
      data[cleanTarget].lastUpdated = Date.now()

      await saveFollowData(data)

      return NextResponse.json({
        success: true,
        message: 'Successfully unfollowed user',
        followingCount: data[cleanFollower].following.length,
        followersCount: data[cleanFollower].followers.length
      })
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error)
    return NextResponse.json({ error: 'Failed to follow/unfollow user' }, { status: 500 })
  }
}

