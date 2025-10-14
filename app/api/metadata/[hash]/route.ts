import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params
    
    if (!hash) {
      return NextResponse.json({ error: 'Hash parameter is required' }, { status: 400 })
    }

    // For now, return basic metadata
    // In production, you might want to fetch this from IPFS or a database
    const metadata = {
      name: `WeAD Music NFT #${hash.substring(0, 8)}`,
      description: "AI-generated music NFT from WeAD Music Platform",
      image: "https://wead.io/images/music-nft-placeholder.png",
      external_url: `https://wead.io/music/${hash}`,
      attributes: [
        {
          trait_type: "Platform",
          value: "WeAD Music"
        },
        {
          trait_type: "Generation Method",
          value: "AI-Generated"
        },
        {
          trait_type: "Storage",
          value: "IPFS"
        }
      ]
    }

    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      }
    })

  } catch (error) {
    console.error('Metadata error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch metadata' 
    }, { status: 500 })
  }
}



