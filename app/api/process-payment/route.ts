import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const MUSIC_PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'

// Simplified MusicPayment ABI - just the functions we need
const MUSIC_PAYMENT_ABI = [
  "function payWithUSDC(string memory title, string memory style) external",
  "function payWithWeAD(string memory title, string memory style, uint256 weadAmount) external",
  "function musicGenerationPrice() external view returns (uint256)",
  "function getUserGenerations(address user) external view returns (tuple(address user, string title, string style, uint256 timestamp, address paymentToken, uint256 amountPaid)[] memory)",
  "event MusicPaid(address indexed user, string title, string style, address paymentToken, uint256 amount, uint256 timestamp)"
]

export async function POST(request: NextRequest) {
  try {
    const { paymentType, title, style, userAddress, weadAmount } = await request.json()

    if (!MUSIC_PAYMENT_ADDRESS) {
      console.log('Music Payment contract not configured')
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Payment contract not configured. Using mock payment for testing.',
        txHash: '0x' + Math.random().toString(16).substring(2, 66)
      })
    }

    if (!userAddress || !title || !style) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Set up provider
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const musicPayment = new ethers.Contract(
      MUSIC_PAYMENT_ADDRESS,
      MUSIC_PAYMENT_ABI,
      provider
    )

    // Get the current price
    const price = await musicPayment.musicGenerationPrice()

    return NextResponse.json({
      success: true,
      contractAddress: MUSIC_PAYMENT_ADDRESS,
      price: price.toString(),
      paymentType,
      message: 'Ready for payment. User must approve transaction in wallet.'
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')

    if (!MUSIC_PAYMENT_ADDRESS) {
      return NextResponse.json({
        generations: [],
        mock: true
      })
    }

    if (!userAddress) {
      return NextResponse.json({ 
        error: 'User address is required' 
      }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const musicPayment = new ethers.Contract(
      MUSIC_PAYMENT_ADDRESS,
      MUSIC_PAYMENT_ABI,
      provider
    )

    const generations = await musicPayment.getUserGenerations(userAddress)

    return NextResponse.json({
      success: true,
      generations: generations.map((gen: any) => ({
        title: gen.title,
        style: gen.style,
        timestamp: Number(gen.timestamp),
        paymentToken: gen.paymentToken,
        amountPaid: gen.amountPaid.toString()
      }))
    })

  } catch (error) {
    console.error('Error fetching user generations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch user generations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



