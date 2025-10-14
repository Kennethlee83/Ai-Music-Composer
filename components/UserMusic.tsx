'use client'

import { useAccount, useContractRead } from 'wagmi'
import { MusicNFTABI } from '@/lib/contracts'
import { Music, Play, Pause, Download, Volume2 } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

export function UserMusic() {
  const { address, isConnected } = useAccount()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const { data: userMusic } = useContractRead({
    address: process.env.NEXT_PUBLIC_MUSIC_NFT_ADDRESS as `0x${string}`,
    abi: MusicNFTABI,
    functionName: 'getUserMusic',
    args: address ? [address] : undefined,
    enabled: isConnected,
  })

  if (!isMounted) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🎵 My Music</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🎵 My Music</h3>
        <p className="text-gray-500">Connect your wallet to view your music</p>
      </div>
    )
  }

  if (!userMusic || userMusic.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🎵 My Music</h3>
        <div className="text-center py-8">
          <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No music generated yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Generate your first AI music to see it here!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">🎵 My Music ({userMusic.length})</h3>
      
      <div className="space-y-4">
        {userMusic.map((tokenId: any) => (
          <MusicCard key={tokenId.toString()} tokenId={BigInt(tokenId)} />
        ))}
      </div>
    </div>
  )
}

function MusicCard({ tokenId }: { tokenId: bigint }) {
  const { data: musicData } = useContractRead({
    address: process.env.NEXT_PUBLIC_MUSIC_NFT_ADDRESS as `0x${string}`,
    abi: MusicNFTABI,
    functionName: 'getMusicData',
    args: [tokenId],
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Get IPFS audio URL
  useEffect(() => {
    if (musicData?.ipfsHash) {
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${musicData.ipfsHash}`
      setAudioUrl(ipfsUrl)
    }
  }, [musicData?.ipfsHash])

  const handlePlayPause = async () => {
    if (!audioUrl) return

    try {
      if (!audioRef.current) {
        // Create audio element
        const audio = new Audio(audioUrl)
        audio.preload = 'metadata'
        
        audio.addEventListener('loadeddata', () => {
          setIsLoading(false)
        })
        
        audio.addEventListener('error', () => {
          setIsLoading(false)
          alert('Failed to load audio file')
        })
        
        audioRef.current = audio
      }

      const audio = audioRef.current

      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        setIsLoading(true)
        try {
          await audio.play()
          setIsPlaying(true)
        } catch (error) {
          console.error('Playback error:', error)
          alert('Failed to play audio')
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('Audio error:', error)
      alert('Audio playback not supported')
    }
  }

  const handleDownload = async () => {
    if (!musicData?.ipfsHash) return

    try {
      const filename = `${musicData.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
      const downloadUrl = `/api/download-music?hash=${musicData.ipfsHash}&title=${encodeURIComponent(musicData.title)}`
      
      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download music file')
    }
  }

  if (!musicData) {
    return (
      <div className="border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{musicData.title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Style: {musicData.style} • {musicData.instrumental ? 'Instrumental' : 'With Lyrics'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Generated: {new Date(Number(musicData.timestamp) * 1000).toLocaleDateString()}
          </p>
          
          {audioUrl && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs text-green-600 flex items-center">
                <Volume2 className="h-3 w-3 mr-1" />
                Audio Available
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button 
            onClick={handlePlayPause}
            disabled={!audioUrl || isLoading}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600"></div>
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button 
            onClick={handleDownload}
            disabled={!audioUrl}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download MP3"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {musicData.lyrics && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 line-clamp-3">
            {musicData.lyrics}
          </p>
        </div>
      )}
      
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  )
}
