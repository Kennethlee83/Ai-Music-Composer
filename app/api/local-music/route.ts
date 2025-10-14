import { NextRequest, NextResponse } from 'next/server'
import { getLocalMusicFiles, getLocalMusicFile } from '@/lib/localStorage'
import { 
  validateEthereumAddress,
  sanitizeFilename,
  sanitizeError,
  checkRateLimit
} from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const userAddress = searchParams.get('userAddress')

    // Validate user address if provided
    if (userAddress) {
      const addressValidation = validateEthereumAddress(userAddress)
      if (!addressValidation.isValid) {
        return NextResponse.json({ error: addressValidation.error }, { status: 400 })
      }
    }

    // Rate limiting: 30 requests per minute per IP
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `local-music:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60 * 1000) // 30 per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many requests. Please try again in a moment.' 
      }, { status: 429 })
    }

    // If filename is provided, serve the specific file
    if (filename && userAddress) {
      const addressValidation = validateEthereumAddress(userAddress)
      if (!addressValidation.isValid) {
        return NextResponse.json({ error: addressValidation.error }, { status: 400 })
      }

      const sanitizedFilename = sanitizeFilename(filename)
      const fileBuffer = await getLocalMusicFile(addressValidation.sanitized, sanitizedFilename)
      
      if (!fileBuffer) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      return new NextResponse(fileBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    }

    // Otherwise, return list of music files for this user
    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 })
    }

    const addressValidation = validateEthereumAddress(userAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 })
    }

    const musicFiles = await getLocalMusicFiles(addressValidation.sanitized)
    
    return NextResponse.json({
      success: true,
      files: musicFiles
    })

  } catch (error) {
    console.error('Error serving local music:', error)
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}