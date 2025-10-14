import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { uploadToIPFS } from '@/lib/ipfs'
import { saveMusicToLocal } from '@/lib/localStorage'
import { 
  validateAndSanitizeText, 
  validateEthereumAddress, 
  validateBoolean,
  checkRateLimit,
  sanitizeError 
} from '@/lib/security'

const SUNO_API_KEY = process.env.SUNO_API_KEY || 'b71b02c7d53af5da4ab6afa66bcebc29'
const SUNO_BASE_URL = process.env.SUNO_BASE_URL || 'https://apibox.erweima.ai'

// Increase API route timeout to 15 minutes for music generation
export const maxDuration = 900 // 900 seconds = 15 minutes
export const dynamic = 'force-dynamic'

// Function to generate lyrics using Suno API
async function generateLyrics(prompt: string): Promise<{ success: boolean; lyrics?: string }> {
  try {
    console.log('Generating lyrics with prompt:', prompt)
    
    const lyricsPayload = {
      prompt: prompt.substring(0, 200), // Max 200 words as per API docs
      callBackUrl: "https://wead.io/callback"
    }

    const response = await axios.post(`${SUNO_BASE_URL}/api/v1/lyrics`, lyricsPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`
      },
      timeout: 120000 // 2 minutes - initial API call can be slow
    })

    if (response.data.code === 200 && response.data.data) {
      const taskId = response.data.data.taskId
      console.log('Lyrics generation started, taskId:', taskId)
      
      // Poll for lyrics completion
      const lyricsResult = await monitorLyricsGeneration(taskId)
      return lyricsResult
    } else {
      console.error('Lyrics generation failed:', response.data.msg)
      return { success: false }
    }
  } catch (error) {
    console.error('Lyrics generation error:', error)
    return { success: false }
  }
}

// Function to monitor lyrics generation
async function monitorLyricsGeneration(taskId: string): Promise<{ success: boolean; lyrics?: string }> {
  const maxAttempts = 60 // 60 attempts with 5-second intervals (300 seconds = 5 minutes)
  let attempts = 0

  console.log(`Monitoring lyrics generation for task ${taskId}... (max wait time: 5 minutes)`)

  while (attempts < maxAttempts) {
    try {
      console.log(`Checking lyrics status (attempt ${attempts + 1}/${maxAttempts})...`)
      
      const response = await axios.get(
        `${SUNO_BASE_URL}/api/v1/lyrics/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      console.log('Lyrics status response:', response.data)

      if (response.data.code === 200 && response.data.data) {
        const status = response.data.data.status
        console.log(`Lyrics task status: ${status}`)
        
        if (status === 'SUCCESS') {
          const lyricsData = response.data.data.response
          console.log('Lyrics data received:', lyricsData)
          
          if (lyricsData && lyricsData.length > 0) {
            // Use the first lyrics variant
            const firstLyrics = lyricsData[0]
            if (firstLyrics.status === 'complete' && firstLyrics.text) {
              console.log('Lyrics generated successfully:', firstLyrics.text)
              return { success: true, lyrics: firstLyrics.text }
            }
          }
          // If we have lyrics data but no complete status, still return the first one
          if (lyricsData && lyricsData.length > 0 && lyricsData[0].text) {
            console.log('Using lyrics despite status:', lyricsData[0].text)
            return { success: true, lyrics: lyricsData[0].text }
          }
        } else if (status === 'GENERATE_LYRICS_FAILED' || status === 'SENSITIVE_WORD_ERROR') {
          console.error('Lyrics generation failed with status:', status)
          return { success: false }
        }
      }

      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    } catch (error) {
      console.error('Lyrics monitoring error:', error)
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  console.error('Lyrics generation timeout')
  return { success: false }
}

export async function POST(request: NextRequest) {
  console.log('🎵 Music generation API called')
  
  // Store userAddress at function level so it's accessible in catch block for refunds
  let userAddressForRefund: string | null = null
  
  try {
    const body = await request.json()
    const { style, title, lyrics, instrumental, userAddress } = body
    userAddressForRefund = userAddress // Store for potential refund in catch block
    
    console.log('📝 Request params:', {
      title,
      style,
      instrumental,
      hasLyrics: !!lyrics,
      userAddress
    })

    // Validate and sanitize inputs
    const titleValidation = validateAndSanitizeText(title, 200, 'Title')
    if (!titleValidation.isValid) {
      return NextResponse.json({ error: titleValidation.error }, { status: 400 })
    }

    const styleValidation = validateAndSanitizeText(style, 1000, 'Style')
    if (!styleValidation.isValid) {
      return NextResponse.json({ error: styleValidation.error }, { status: 400 })
    }

    // Lyrics validation - only required if NOT instrumental
    const isInstrumental = validateBoolean(instrumental)
    let sanitizedLyrics = ''
    
    if (!isInstrumental) {
      // Lyrics are required for non-instrumental songs
      const lyricsValidation = validateAndSanitizeText(lyrics || '', 3000, 'Lyrics')
      if (!lyricsValidation.isValid) {
        return NextResponse.json({ error: lyricsValidation.error }, { status: 400 })
      }
      sanitizedLyrics = lyricsValidation.sanitized
    } else {
      // For instrumental, lyrics are optional
      if (lyrics && lyrics.trim()) {
        const lyricsValidation = validateAndSanitizeText(lyrics, 3000, 'Lyrics')
        if (lyricsValidation.isValid) {
          sanitizedLyrics = lyricsValidation.sanitized
        }
      }
    }

    const addressValidation = validateEthereumAddress(userAddress)
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 })
    }

    // Rate limiting: 5 requests per hour per user
    const rateLimitKey = `music-gen:${addressValidation.sanitized}`
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000) // 5 requests per hour
    
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime || Date.now())
      return NextResponse.json({ 
        error: `Rate limit exceeded. Please try again after ${resetTime.toLocaleTimeString()}` 
      }, { status: 429 })
    }

    // Use sanitized values
    const sanitizedTitle = titleValidation.sanitized
    const sanitizedStyle = styleValidation.sanitized
    const sanitizedAddress = addressValidation.sanitized

    // Use the real Suno API
    console.log('Using Suno API for music generation')

    // Use the official Suno API structure with sanitized values
    // Create a more descriptive prompt for instrumental vs. lyrical songs
    let finalPrompt: string
    if (isInstrumental) {
      // For instrumental: Create a rich, descriptive prompt
      finalPrompt = `Create an instrumental ${sanitizedStyle} track with rich melodies and atmosphere`
    } else {
      // For lyrical songs: Use the actual lyrics as the prompt
      finalPrompt = sanitizedLyrics
    }
    
    const payload = {
      prompt: finalPrompt,
      style: sanitizedStyle,
      title: sanitizedTitle,
      customMode: true,
      instrumental: isInstrumental,
      model: "V5", // Keep V5 as requested
      callBackUrl: "https://wead.io/callback"
    }

    // Debug logging
    console.log('Final payload being sent to Suno:', JSON.stringify(payload, null, 2))

    const response = await axios.post(`${SUNO_BASE_URL}/api/v1/generate`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`
      },
      timeout: 120000 // 2 minutes - initial API call can be slow
    })

    if (response.data.code === 200 && response.data.data) {
      const taskId = response.data.data.taskId
      
      // Start monitoring the generation process with sanitized values
      try {
        console.log(`🎵 Starting generation monitoring for task: ${taskId}`)
        
        const musicData = await monitorGeneration(taskId, {
          style: sanitizedStyle,
          title: sanitizedTitle,
          lyrics: sanitizedLyrics,
          instrumental: isInstrumental,
          userAddress: sanitizedAddress
        })

        console.log('✅ Music generation monitoring completed successfully!')
        console.log('📤 Preparing JSON response for client...')
        
        const response = NextResponse.json({ 
          success: true, 
          taskId,
          musicData 
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
        
        console.log('✅ JSON response created and being sent to client!')
        return response
      } catch (genError: any) {
        // REFUND ON ANY ERROR - User shouldn't lose credit for ANY failure
        console.log(`❌ Generation error detected: ${genError.message}`)
        console.log(`🔄 AUTO-REFUNDING credit to user: ${sanitizedAddress}`)
        
        let refundSuccess = false
        let refundTxHash = ''
        
        // Call refund function on smart contract
        try {
          const { ethers } = await import('ethers')
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/'
          )
          
          // Use owner's private key to call refundCredit
          const ownerPrivateKey = process.env.PRIVATE_KEY
          if (!ownerPrivateKey) {
            throw new Error('Owner private key not configured')
          }
          
          const wallet = new ethers.Wallet(ownerPrivateKey, provider)
          
          const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS
          if (!PAYMENT_ADDRESS) {
            throw new Error('Payment contract not configured')
          }
          
          const PAYMENT_ABI = [
            "function addTestCredits(address user, uint256 amount) external"
          ]
          
          const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, wallet)
          
          // Refund 1 credit using addTestCredits
          const tx = await paymentContract.addTestCredits(
            sanitizedAddress,
            1
          )
          await tx.wait()
          
          refundSuccess = true
          refundTxHash = tx.hash
          
          console.log(`✅ Credit refunded successfully to ${sanitizedAddress}`)
          console.log(`📝 Transaction: ${tx.hash}`)
        } catch (refundError) {
          console.error('❌ Failed to refund credit:', refundError)
          // Continue - we'll still tell the user about the error and that refund was attempted
        }
        
        // Get error reason
        const errorReason = genError.reason || genError.message || 'Unknown error'
        
        // Return user-friendly error message
        return NextResponse.json({
          success: false,
          error: refundSuccess 
            ? `Music generation failed: ${errorReason}. Your credit has been automatically refunded!`
            : `Music generation failed: ${errorReason}. Credit refund was attempted but may need manual review. Please contact support with your wallet address.`,
          refunded: refundSuccess,
          refundTxHash: refundTxHash || undefined,
          reason: errorReason
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({ 
        error: response.data.msg || 'Music generation failed' 
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in music generation:', error)
    console.error('Error stack:', error.stack)
    
    // Always return JSON, never let the error propagate as HTML
    const errorMessage = error.message || 'Unknown error occurred'
    const sanitizedError = sanitizeError(error)
    
    // Attempt automatic refund on critical errors
    let refundSuccess = false
    let refundTxHash = ''
    
    if (userAddressForRefund) {
      console.log(`🔄 Attempting refund for critical error to: ${userAddressForRefund}`)
      try {
        const { ethers } = await import('ethers')
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/'
        )
        
        const ownerPrivateKey = process.env.PRIVATE_KEY
        if (ownerPrivateKey) {
          const wallet = new ethers.Wallet(ownerPrivateKey, provider)
          const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS
          
          if (PAYMENT_ADDRESS) {
            const PAYMENT_ABI = [
              "function addTestCredits(address user, uint256 amount) external"
            ]
            const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, wallet)
            const tx = await paymentContract.addTestCredits(userAddressForRefund, 1)
            await tx.wait()
            
            refundSuccess = true
            refundTxHash = tx.hash
            console.log(`✅ Critical error refund successful: ${tx.hash}`)
          }
        }
      } catch (refundError) {
        console.error('❌ Failed to refund for critical error:', refundError)
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: refundSuccess
        ? `Server error occurred: ${sanitizedError}. Your credit has been automatically refunded!`
        : `Server error occurred: ${sanitizedError}. Please contact support with your wallet address for a refund.`,
      refunded: refundSuccess,
      refundTxHash: refundTxHash || undefined,
      technicalDetails: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

async function monitorGeneration(taskId: string, params: any) {
  const maxAttempts = 120 // 120 attempts with 5-second intervals (600 seconds = 10 minutes)
  let attempts = 0

  console.log(`Starting to monitor task ${taskId}... (max wait time: 10 minutes)`)

  while (attempts < maxAttempts) {
    try {
      console.log(`Checking task status (attempt ${attempts + 1}/${maxAttempts})...`)
      
      const response = await axios.get(
        `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      console.log('Status response:', response.data)

      if (response.data.code === 200 && response.data.data) {
        const status = response.data.data.status
        console.log(`Task status: ${status}`)
        
        // Check for content policy violations - IMMEDIATELY stop and refund
        if (status === 'SENSITIVE_WORD_ERROR') {
          const errorMessage = response.data.data.errorMessage || 'Unknown error'
          
          console.error(`❌ SENSITIVE_WORD_ERROR detected: ${errorMessage}`)
          console.log(`🛑 Stopping generation immediately and refunding credit...`)
          
          // Throw special error that will trigger immediate refund
          const error: any = new Error(`Content policy violation: ${errorMessage}`)
          error.refundCredit = true
          error.reason = errorMessage
          throw error
        }
        
        // Check for other failures
        if (status === 'FAILED') {
          const errorMessage = response.data.data.errorMessage || 'Unknown error'
          console.error(`Generation failed with status: ${status}`)
          console.error(`Error message: ${errorMessage}`)
          throw new Error(`Music generation failed: ${errorMessage}`)
        }
        
        if (status === 'SUCCESS') {
          const musicData = response.data.data.response
          console.log('Music data received:', musicData)
          
          if (musicData && musicData.sunoData && musicData.sunoData.length > 0) {
            console.log(`Found ${musicData.sunoData.length} generated songs`)
            
            const savedFiles = []
            const ipfsResults = []
            
            // Process all generated songs
            for (let i = 0; i < musicData.sunoData.length; i++) {
              const audioUrl = musicData.sunoData[i].audioUrl
              console.log(`Processing song ${i + 1}/${musicData.sunoData.length}: ${audioUrl}`)
              
              try {
                // Test if the audio URL is accessible
                const testResponse = await axios.head(audioUrl, {
                  headers: {
                    'Authorization': `Bearer ${SUNO_API_KEY}`
                  },
                  timeout: 10000
                })
                
                if (testResponse.status === 200) {
                  // Save to local storage with clean title
                  const songTitle = params.title
                  
                  const localFile = await saveMusicToLocal(audioUrl, {
                    userAddress: params.userAddress,
                    title: songTitle,
                    style: params.style,
                    lyrics: params.lyrics
                  })
                  
                  savedFiles.push(localFile)
                  
                  // Also upload to IPFS (optional)
                  const ipfsResult = await uploadToIPFS(audioUrl, {
                    userAddress: params.userAddress,
                    title: songTitle,
                    style: params.style
                  })
                  
                  ipfsResults.push(ipfsResult)
                  
                  console.log(`Successfully saved song ${i + 1}: ${localFile.filename}`)
                }
              } catch (testError) {
                console.error(`Audio URL test failed for song ${i + 1}:`, testError)
                    // Continue with the URL anyway, might work for download
                    const songTitle = params.title
                
                const localFile = await saveMusicToLocal(audioUrl, {
                  userAddress: params.userAddress,
                  title: songTitle,
                  style: params.style,
                  lyrics: params.lyrics
                })
                
                savedFiles.push(localFile)
                
                const ipfsResult = await uploadToIPFS(audioUrl, {
                  userAddress: params.userAddress,
                  title: songTitle,
                  style: params.style
                })
                
                ipfsResults.push(ipfsResult)
                
                console.log(`Saved song ${i + 1} despite test failure: ${localFile.filename}`)
              }
            }
            
            // Return the first song's data for backward compatibility
            if (savedFiles.length > 0) {
              console.log('✅ All songs processed successfully, returning data to client...')
              console.log(`📦 Returning ${savedFiles.length} songs: ${savedFiles.map(f => f.filename).join(', ')}`)
              
              const result = {
                ipfsHash: ipfsResults[0].ipfsHash,
                audioUrl: ipfsResults[0].audioUrl,
                localFile: savedFiles[0],
                allLocalFiles: savedFiles, // Include all saved files
                allIpfsResults: ipfsResults, // Include all IPFS results
                originalSunoUrl: musicData.sunoData[0].audioUrl,
                title: params.title,
                style: params.style,
                totalSongs: savedFiles.length
              }
              
              console.log('📤 Data prepared, sending response now...')
              return result
            } else {
              console.error('❌ No files were saved despite SUCCESS status!')
            }
          }
        }
      }

      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    } catch (error: any) {
      console.error('Monitoring error:', error)
      
      // IMMEDIATELY re-throw errors that need credit refunds - don't continue looping!
      if (error.refundCredit) {
        console.log('🚨 Credit refund error detected - stopping monitoring immediately!')
        throw error
      }
      
      // For other errors, continue monitoring
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  // Timeout - should trigger refund
  const timeoutError: any = new Error('Music generation timeout - maximum wait time exceeded')
  timeoutError.refundCredit = true
  timeoutError.reason = 'Generation took too long'
  throw timeoutError
}



