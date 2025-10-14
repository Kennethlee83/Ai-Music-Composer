'use client'

import { useState, useEffect } from 'react'
// import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { WeADTokenABI } from '@/lib/contracts'
import { Music, Loader2 } from 'lucide-react'

interface MusicParams {
  style: string
  title: string
  lyrics: string
  instrumental: boolean
}

// Mock hooks for when wagmi is not imported
const useAccount = () => ({ address: null, isConnected: false })
const useContractWrite = (_args?: any) => ({ write: () => {}, data: null })
const useWaitForTransaction = (_args?: any) => ({ isLoading: false })

export function MusicGeneration() {
  const { address, isConnected } = useAccount()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  const [params, setParams] = useState<MusicParams>({
    style: '',
    title: '',
    lyrics: '',
    instrumental: false
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const { write: payForGeneration, data: hash } = useContractWrite({
    address: process.env.NEXT_PUBLIC_WEAD_TOKEN_ADDRESS as `0x${string}`,
    abi: WeADTokenABI,
    functionName: 'payForMusicGeneration',
    args: [params.style, params.title],
  } as any) as any

  const { isLoading: isPending } = useWaitForTransaction({
    hash: (hash as any)?.hash,
    onSuccess: () => {
      // Start music generation after payment
      generateMusic()
    }
  } as any) as any

  const generateMusic = async () => {
    setIsGenerating(true)
    try {
      // Step 1: Generate music with Suno AI
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          userAddress: address
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Step 2: Mint NFT with the generated music data
        const mintResponse = await fetch('/api/mint-nft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: address,
            style: params.style,
            title: params.title,
            lyrics: params.lyrics,
            instrumental: params.instrumental,
            ipfsHash: result.musicData.ipfsHash,
            audioUrl: result.musicData.audioUrl
          })
        })
        
        const mintResult = await mintResponse.json()
        
        if (mintResult.success) {
          alert(`🎵 Music generated and NFT minted successfully!\nToken ID: #${mintResult.tokenId}\nYou can now play and download your music!`)
        } else {
          alert('Music generated but NFT minting failed: ' + mintResult.error)
        }
      } else {
        alert('Music generation failed: ' + result.error)
      }
    } catch (error) {
      console.error('Error generating music:', error)
      alert('Error generating music')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }
    payForGeneration()
  }

  if (!isMounted) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🎵 Generate Music</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🎵 Generate Music</h3>
        <p className="text-gray-500">Connect your wallet to generate music</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">🎵 Generate Music</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Music Style
          </label>
          <input
            type="text"
            value={params.style}
            onChange={(e) => setParams({...params, style: e.target.value})}
            placeholder="e.g., rock, jazz, electronic, classical"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Song Title
          </label>
          <input
            type="text"
            value={params.title}
            onChange={(e) => setParams({...params, title: e.target.value})}
            placeholder="Enter song title"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lyrics (Optional)
          </label>
          <textarea
            value={params.lyrics}
            onChange={(e) => setParams({...params, lyrics: e.target.value})}
            placeholder="Enter lyrics for your song"
            className="input-field h-24"
            rows={3}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="instrumental"
            checked={params.instrumental}
            onChange={(e) => setParams({...params, instrumental: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="instrumental" className="text-sm text-gray-700">
            Instrumental (no vocals)
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending || isGenerating}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isPending || isGenerating ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {isPending ? 'Processing Payment...' : 'Generating Music...'}
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Generate Music (10 WEAD)
            </>
          )}
        </button>
      </form>
    </div>
  )
}
