'use client'

import { useState, useEffect } from 'react'
import { Users, Play, Pause, Download, Filter, Search, Music } from 'lucide-react'

interface SharedTrack {
  id: string
  walletAddress: string
  displayName: string
  title: string
  style: string
  lyrics?: string
  description: string
  filename: string
  filepath: string
  sharedAt: number
  plays: number
  size: number
}

export function CommunityFeed() {
  const [tracks, setTracks] = useState<SharedTrack[]>([])
  const [filteredTracks, setFilteredTracks] = useState<SharedTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    loadCommunityTracks()
  }, [])

  useEffect(() => {
    filterTracks()
  }, [tracks, searchTerm, selectedGenre])

  const loadCommunityTracks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/community/share-music')
      const data = await response.json()
      
      if (data.success) {
        setTracks(data.tracks)
      }
    } catch (error) {
      console.error('Error loading community tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTracks = () => {
    let filtered = [...tracks]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.style.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(track => track.style.toLowerCase() === selectedGenre.toLowerCase())
    }

    setFilteredTracks(filtered)
  }

  const getUniqueGenres = () => {
    const genres = new Set(tracks.map(track => track.style))
    return Array.from(genres).sort()
  }

  const togglePlayPause = async (track: SharedTrack) => {
    try {
      // If same file is playing
      if (playingTrack === track.id && audioElement) {
        if (isPaused) {
          audioElement.play()
          setIsPaused(false)
        } else {
          audioElement.pause()
          setIsPaused(true)
        }
        return
      }

      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause()
        setAudioElement(null)
        setPlayingTrack(null)
        setIsPaused(false)
      }

      // Play new track
      const audio = new Audio(`/api/local-music?filename=${track.filename}&userAddress=${track.walletAddress}`)
      audio.preload = 'metadata'
      
      audio.addEventListener('loadeddata', () => {
        audio.play().catch(err => {
          console.error('Play error:', err)
          alert('Failed to play audio file')
        })
        setPlayingTrack(track.id)
        setAudioElement(audio)
        setIsPaused(false)
      })

      audio.addEventListener('ended', () => {
        setPlayingTrack(null)
        setAudioElement(null)
        setIsPaused(false)
      })

      audio.addEventListener('error', () => {
        console.error('Audio error')
        alert('Failed to load audio file')
        setPlayingTrack(null)
        setAudioElement(null)
      })

    } catch (error) {
      console.error('Error playing music:', error)
      alert('Failed to play music')
    }
  }

  const downloadTrack = (track: SharedTrack) => {
    const link = document.createElement('a')
    link.href = `/api/local-music?filename=${track.filename}&userAddress=${track.walletAddress}`
    link.download = `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading community feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
          <Users className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl text-quantum text-orange-500">COMMUNITY FEED</h3>
        <div className="flex-1"></div>
        <div className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg glow-orange">
          <span className="text-white font-bold text-quantum">{tracks.length} TRACKS</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tracks or artists..."
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
          >
            <option value="all">All Genres</option>
            {getUniqueGenres().map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tracks Grid */}
      {filteredTracks.length === 0 ? (
        <div className="text-center py-12">
          <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-quantum">
            {searchTerm || selectedGenre !== 'all' ? 'No tracks match your filters' : 'No tracks shared yet'}
          </p>
          <p className="text-sm text-gray-500 mt-2">Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTracks.map((track) => (
            <div key={track.id} className="bg-gradient-to-r from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-orange-500 text-quantum text-lg group-hover:text-orange-400">
                    {track.title}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    by <span className="text-orange-600 font-semibold">{track.displayName}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="text-orange-600">▸</span> {track.style} • {formatFileSize(track.size)} • {formatDate(track.sharedAt)}
                  </p>
                  {track.description && (
                    <p className="text-sm text-gray-400 mt-3 italic border-l-2 border-orange-900 pl-3">
                      "{track.description}"
                    </p>
                  )}
                  
                  <div className="mt-3 flex items-center space-x-2">
                    {playingTrack === track.id && !isPaused && (
                      <span className="text-xs text-orange-500 flex items-center animate-pulse">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-ping"></span>
                        PLAYING
                      </span>
                    )}
                    {playingTrack === track.id && isPaused && (
                      <span className="text-xs text-yellow-500 flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                        PAUSED
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
                  <button
                    onClick={() => togglePlayPause(track)}
                    className="flex-1 sm:flex-none p-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-110 glow-orange"
                    title={playingTrack === track.id && !isPaused ? 'Pause' : 'Play'}
                  >
                    {playingTrack === track.id && !isPaused ? (
                      <Pause className="h-5 w-5 mx-auto" />
                    ) : (
                      <Play className="h-5 w-5 mx-auto" />
                    )}
                  </button>
                  <button
                    onClick={() => downloadTrack(track)}
                    className="flex-1 sm:flex-none p-3 bg-gray-800 hover:bg-gray-700 text-orange-500 border border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-110"
                    title="Download MP3"
                  >
                    <Download className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

