import { NextRequest, NextResponse } from 'next/server'
import { downloadFromIPFS } from '@/lib/ipfs'
import axios from 'axios'
import { 
  validateIPFSHash, 
  validateAndSanitizeText,
  sanitizeFilename,
  sanitizeError,
  checkRateLimit
} from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ipfsHash = searchParams.get('hash')
    const title = searchParams.get('title') || 'music'

    // Validate IPFS hash
    if (!ipfsHash) {
      return NextResponse.json({ error: 'IPFS hash is required' }, { status: 400 })
    }

    const hashValidation = validateIPFSHash(ipfsHash)
    if (!hashValidation.isValid) {
      return NextResponse.json({ error: hashValidation.error }, { status: 400 })
    }

    // Validate and sanitize title
    const titleValidation = validateAndSanitizeText(title, 200, 'Title')
    const sanitizedTitle = titleValidation.isValid ? titleValidation.sanitized : 'music'

    // Rate limiting: 20 downloads per minute per IP
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `download:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey, 20, 60 * 1000) // 20 per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many download requests. Please try again in a moment.' 
      }, { status: 429 })
    }

    // For testing with mock IPFS hashes, use a sample audio file
    if (ipfsHash.startsWith('QmMock') || ipfsHash.startsWith('Qmby1')) {
      console.log('Using mock audio for testing')
      
      // Use a sample audio file for testing
      const sampleAudioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      const response = await axios.get(sampleAudioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      })
      
      const audioBuffer = Buffer.from(response.data)
      const filename = `${sanitizeFilename(sanitizedTitle)}.wav`
      
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': audioBuffer.length.toString(),
        },
      })
    }

    // Download the audio file from IPFS
    const audioBlob = await downloadFromIPFS(hashValidation.sanitized)
    
    // Convert blob to buffer
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer())
    
    // Set headers for file download with sanitized filename
    const filename = `${sanitizeFilename(sanitizedTitle)}.mp3`
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ipfsHash, title } = await request.json()

    // Validate IPFS hash
    if (!ipfsHash) {
      return NextResponse.json({ error: 'IPFS hash is required' }, { status: 400 })
    }

    const hashValidation = validateIPFSHash(ipfsHash)
    if (!hashValidation.isValid) {
      return NextResponse.json({ error: hashValidation.error }, { status: 400 })
    }

    // Validate title
    const titleValidation = validateAndSanitizeText(title || 'music', 200, 'Title')
    const sanitizedTitle = titleValidation.isValid ? titleValidation.sanitized : 'music'

    // Get the IPFS URL for streaming
    const audioUrl = `https://gateway.pinata.cloud/ipfs/${hashValidation.sanitized}`
    
    return NextResponse.json({ 
      success: true,
      audioUrl,
      downloadUrl: `/api/download-music?hash=${hashValidation.sanitized}&title=${encodeURIComponent(sanitizedTitle)}`
    })

  } catch (error) {
    console.error('Stream error:', error)
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}
