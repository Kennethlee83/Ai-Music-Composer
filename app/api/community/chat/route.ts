import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { validateAndSanitizeText, validateEthereumAddress, checkRateLimit } from '@/lib/security'

const CHAT_FOLDER = 'community_data/chat'
const CHAT_FILE = 'community_data/chat/messages.json'
const PROFILES_FOLDER = 'community_data/profiles'
const MAX_MESSAGES = 100

interface ChatMessage {
  id: string
  walletAddress: string
  displayName: string
  avatar?: string
  message: string
  timestamp: number
  type: 'message' | 'trade_offer' | 'sale_listing'
  metadata?: {
    trackId?: string
    trackTitle?: string
    price?: string
    currency?: 'WeAD' | 'BNB'
    offerTo?: string
  }
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

// GET - Get recent chat messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    
    await fs.mkdir(CHAT_FOLDER, { recursive: true })

    let messages: ChatMessage[] = []
    
    try {
      const data = await fs.readFile(CHAT_FILE, 'utf-8')
      messages = JSON.parse(data)
    } catch {
      messages = []
    }

    if (since) {
      const sinceTimestamp = parseInt(since)
      messages = messages.filter(msg => msg.timestamp > sinceTimestamp)
    }

    const recentMessages = messages.slice(-MAX_MESSAGES)

    // Enrich messages with avatars
    const enrichedMessages = await Promise.all(
      recentMessages.map(async (msg) => ({
        ...msg,
        avatar: await getUserAvatar(msg.walletAddress)
      }))
    )

    return NextResponse.json({ success: true, messages: enrichedMessages })
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

// POST - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, displayName, message, type, metadata } = body

    if (!walletAddress || !message) {
      return NextResponse.json({ error: 'Wallet address and message required' }, { status: 400 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
    }
    const cleanAddress = addressValidation.sanitized

    // Rate limiting: 20 messages per minute per wallet
    const rateCheck = checkRateLimit(cleanAddress, 20, 60000)
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Too many messages. Please wait a moment.' 
      }, { status: 429 })
    }

    // Sanitize message
    const messageValidation = validateAndSanitizeText(message, 500, 'Message')
    if (!messageValidation.isValid) {
      return NextResponse.json({ error: messageValidation.error }, { status: 400 })
    }
    const cleanMessage = messageValidation.sanitized

    // Sanitize display name
    const nameValidation = validateAndSanitizeText(displayName || 'Anonymous', 50, 'Display name')
    const cleanName = nameValidation.sanitized

    await fs.mkdir(CHAT_FOLDER, { recursive: true })

    let messages: ChatMessage[] = []
    try {
      const data = await fs.readFile(CHAT_FILE, 'utf-8')
      messages = JSON.parse(data)
    } catch {
      messages = []
    }

    const newMessage: ChatMessage = {
      id: `${cleanAddress}_${Date.now()}`,
      walletAddress: cleanAddress,
      displayName: cleanName,
      message: cleanMessage,
      timestamp: Date.now(),
      type: type || 'message',
      metadata: metadata || {}
    }

    messages.push(newMessage)

    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES)
    }

    await fs.writeFile(CHAT_FILE, JSON.stringify(messages, null, 2))

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

