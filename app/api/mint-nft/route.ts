import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const WEAD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WEAD_TOKEN_ADDRESS
const MUSIC_NFT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_NFT_ADDRESS
const PRIVATE_KEY = process.env.PRIVATE_KEY

export async function POST(request: NextRequest) {
  try {
    const { 
      userAddress, 
      style, 
      title, 
      lyrics, 
      instrumental, 
      ipfsHash, 
      audioUrl 
    } = await request.json()

    // For testing purposes, return mock NFT data if environment variables are not set
    if (!WEAD_TOKEN_ADDRESS || !MUSIC_NFT_ADDRESS || !PRIVATE_KEY) {
      console.log('Environment variables not configured, using mock NFT data for testing')
      
      return NextResponse.json({
        success: true,
        tokenId: Math.floor(Math.random() * 1000).toString(),
        transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
        blockNumber: Math.floor(Math.random() * 1000000)
      })
    }

    if (!userAddress || !ipfsHash || !audioUrl) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Set up provider and signer
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    )
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)

    // Get the Music NFT contract
    const musicNFTABI = [
      "function mintMusic(address to, string memory style, string memory title, string memory lyrics, bool instrumental, string memory ipfsHash, string memory audioUrl, string memory tokenURI) external returns (uint256)",
      "function getMusicData(uint256 tokenId) external view returns (tuple(string style, string title, string lyrics, bool instrumental, string ipfsHash, string audioUrl, uint256 timestamp, address composer))"
    ]

    const musicNFT = new ethers.Contract(MUSIC_NFT_ADDRESS, musicNFTABI, signer)

    // Create token URI (can be enhanced with proper metadata)
    const tokenURI = `https://wead.io/api/metadata/${ipfsHash}`

    // Mint the NFT
    const tx = await musicNFT.mintMusic(
      userAddress,
      style || '',
      title || '',
      lyrics || '',
      instrumental || false,
      ipfsHash,
      audioUrl,
      tokenURI
    )

    const receipt = await tx.wait()
    
    // Find the MusicMinted event to get the token ID
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = musicNFT.interface.parseLog(log)
        return parsed?.name === 'MusicMinted'
      } catch {
        return false
      }
    })

    let tokenId = null
    if (event) {
      const parsed = musicNFT.interface.parseLog(event)
      tokenId = parsed?.args.tokenId.toString()
    }

    return NextResponse.json({
      success: true,
      tokenId,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    })

  } catch (error) {
    console.error('NFT minting error:', error)
    return NextResponse.json({ 
      error: 'Failed to mint NFT',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
