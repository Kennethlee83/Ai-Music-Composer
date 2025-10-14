import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { 
  validateAndSanitizeText, 
  validateEthereumAddress, 
  validateEmail,
  checkRateLimit,
  sanitizeError
} from '@/lib/security'

const WHITELIST_FOLDER = 'whitelist_registrations'

interface WhitelistEntry {
  walletAddress: string
  email: string
  telegram?: string
  twitter?: string
  name?: string
  country?: string
  timestamp: number
  id: string
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Rate limiting: 3 registrations per hour per IP
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `whitelist:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000) // 3 per hour
    
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime || Date.now())
      return NextResponse.json({ 
        error: `Too many registration attempts. Please try again after ${resetTime.toLocaleTimeString()}` 
      }, { status: 429 })
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(data.walletAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ 
        error: addressValidation.error 
      }, { status: 400 })
    }

    // Validate email
    const emailValidation = validateEmail(data.email)
    if (!emailValidation.isValid) {
      return NextResponse.json({ 
        error: emailValidation.error 
      }, { status: 400 })
    }

    // Validate optional fields
    let sanitizedTelegram = ''
    let sanitizedTwitter = ''
    let sanitizedName = ''
    let sanitizedCountry = ''

    if (data.telegram) {
      const telegramValidation = validateAndSanitizeText(data.telegram, 50, 'Telegram')
      if (!telegramValidation.isValid) {
        return NextResponse.json({ error: telegramValidation.error }, { status: 400 })
      }
      sanitizedTelegram = telegramValidation.sanitized
    }

    if (data.twitter) {
      const twitterValidation = validateAndSanitizeText(data.twitter, 50, 'Twitter')
      if (!twitterValidation.isValid) {
        return NextResponse.json({ error: twitterValidation.error }, { status: 400 })
      }
      sanitizedTwitter = twitterValidation.sanitized
    }

    if (data.name) {
      const nameValidation = validateAndSanitizeText(data.name, 100, 'Name')
      if (!nameValidation.isValid) {
        return NextResponse.json({ error: nameValidation.error }, { status: 400 })
      }
      sanitizedName = nameValidation.sanitized
    }

    if (data.country) {
      const countryValidation = validateAndSanitizeText(data.country, 100, 'Country')
      if (!countryValidation.isValid) {
        return NextResponse.json({ error: countryValidation.error }, { status: 400 })
      }
      sanitizedCountry = countryValidation.sanitized
    }

    // Create whitelist folder if it doesn't exist
    try {
      await fs.access(WHITELIST_FOLDER)
    } catch {
      await fs.mkdir(WHITELIST_FOLDER, { recursive: true })
    }

    // Create entry with sanitized data
    const timestamp = Date.now()
    const id = `${addressValidation.sanitized}_${timestamp}`
    
    const entry: WhitelistEntry = {
      walletAddress: addressValidation.sanitized,
      email: emailValidation.sanitized,
      telegram: sanitizedTelegram,
      twitter: sanitizedTwitter,
      name: sanitizedName,
      country: sanitizedCountry,
      timestamp,
      id
    }

    // Check if this wallet is already registered
    const allEntriesFile = path.join(WHITELIST_FOLDER, 'all_registrations.json')
    let allEntries: WhitelistEntry[] = []
    
    try {
      const existingData = await fs.readFile(allEntriesFile, 'utf-8')
      allEntries = JSON.parse(existingData)
      
      // Check for duplicate wallet
      const isDuplicate = allEntries.some(
        e => e.walletAddress.toLowerCase() === addressValidation.sanitized
      )
      
      if (isDuplicate) {
        return NextResponse.json({ 
          error: 'This wallet address is already registered' 
        }, { status: 400 })
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    // Add new entry
    allEntries.push(entry)

    // Save to master file
    await fs.writeFile(allEntriesFile, JSON.stringify(allEntries, null, 2))

    // Also save individual file for this user
    const userFile = path.join(WHITELIST_FOLDER, `${id}.json`)
    await fs.writeFile(userFile, JSON.stringify(entry, null, 2))

    console.log(`✅ Whitelist registration saved: ${addressValidation.sanitized}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully registered for whitelist',
      id
    })

  } catch (error) {
    console.error('Whitelist API error:', error)
    return NextResponse.json({
      error: sanitizeError(error)
    }, { status: 500 })
  }
}

// GET endpoint to retrieve all whitelist entries (admin only)
export async function GET(request: NextRequest) {
  try {
    const allEntriesFile = path.join(WHITELIST_FOLDER, 'all_registrations.json')
    
    try {
      const data = await fs.readFile(allEntriesFile, 'utf-8')
      const entries = JSON.parse(data)
      
      return NextResponse.json({
        success: true,
        total: entries.length,
        entries
      })
    } catch {
      return NextResponse.json({
        success: true,
        total: 0,
        entries: []
      })
    }

  } catch (error) {
    console.error('Whitelist GET error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve whitelist entries'
    }, { status: 500 })
  }
}
