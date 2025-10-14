'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Pause, Download, Volume2, Music, Info, SkipForward, SkipBack } from 'lucide-react'

interface LocalMusicFile {
  filename: string
  filepath: string
  title: string
  style: string
  lyrics?: string
  timestamp: number
  size: number
}

export function LocalMusicPlayer() {
  const { t } = useTranslation()
  const [musicFiles, setMusicFiles] = useState<LocalMusicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [playingFile, setPlayingFile] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationTime, setGenerationTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    // Get user address from wallet with timeout
    const checkWallet = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setUserAddress(accounts[0])
          } else {
            // No wallet connected, stop loading
            setLoading(false)
          }
        } else {
          // No MetaMask detected, stop loading
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking wallet:', error)
        setLoading(false)
      }
    }

    checkWallet()
    
    // Listen for account changes (including disconnection)
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        setUserAddress(null)
        setMusicFiles([])
      } else {
        // Account changed
        setUserAddress(accounts[0])
      }
    }
    
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
    
    // Listen for custom wallet disconnect event
    const handleWalletDisconnect = () => {
      setUserAddress(null)
      setMusicFiles([])
      setLoading(false)
    }
    
    // Listen for custom wallet connect event
    const handleWalletConnect = (event: any) => {
      const address = event.detail?.address
      if (address) {
        setUserAddress(address)
      }
    }
    
    window.addEventListener('walletDisconnected', handleWalletDisconnect)
    window.addEventListener('walletConnected', handleWalletConnect)

    // Timeout fallback - stop loading after 3 seconds
    const timeout = setTimeout(() => {
      if (loading && !userAddress) {
        console.log('Wallet check timeout - stopping loading')
        setLoading(false)
      }
    }, 3000)

    return () => {
      clearTimeout(timeout)
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
      window.removeEventListener('walletDisconnected', handleWalletDisconnect)
      window.removeEventListener('walletConnected', handleWalletConnect)
    }
  }, [])

  useEffect(() => {
    if (userAddress) {
      // Reload music files when wallet connects
      setLoading(true)
      loadMusicFiles()
    } else {
      // Clear data when no wallet
      setMusicFiles([])
      setLoading(false)
    }
  }, [userAddress])

  // Timer effect for generation progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationTime(prev => prev + 1)
      }, 1000)
    } else {
      setGenerationTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  // Listen for generation start/stop events
  useEffect(() => {
    const handleGenerationStart = () => {
      setIsGenerating(true)
      setGenerationTime(0)
    }
    
    const handleGenerationComplete = () => {
      setIsGenerating(false)
      // Add small delay to ensure files are written to disk
      setTimeout(() => {
        loadMusicFiles() // Reload files when generation completes
      }, 500)
    }

    window.addEventListener('musicGenerationStart', handleGenerationStart)
    window.addEventListener('musicGenerationComplete', handleGenerationComplete)

    return () => {
      window.removeEventListener('musicGenerationStart', handleGenerationStart)
      window.removeEventListener('musicGenerationComplete', handleGenerationComplete)
    }
  }, [])

  // Poll for new files to detect when generation is happening
  useEffect(() => {
    if (!userAddress || !isGenerating) return

    const pollInterval = setInterval(async () => {
      const previousCount = musicFiles.length
      await loadMusicFiles()
      
      // If we detect file count changed, generation likely just completed
      if (musicFiles.length > previousCount) {
        setIsGenerating(false)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [userAddress, musicFiles.length, isGenerating])

  const loadMusicFiles = async () => {
    if (!userAddress) {
      setLoading(false)
      return
    }

    try {
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/local-music?userAddress=${userAddress}&t=${timestamp}`)
      const data = await response.json()
      
      if (data.success) {
        setMusicFiles(data.files)
      }
    } catch (error) {
      console.error('Error loading music files:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayPause = async (filename: string) => {
    try {
      // If same file is playing
      if (playingFile === filename && audioElement) {
        if (isPaused) {
          // Resume playback
          audioElement.play()
          setIsPaused(false)
        } else {
          // Pause playback
          audioElement.pause()
          setIsPaused(true)
        }
        return
      }

      // Stop any currently playing audio - completely remove the old element
      if (audioElement) {
        audioElement.pause()
        // Don't set src to '' as it triggers error - just remove the element
        setAudioElement(null)
        setPlayingFile(null)
        setCurrentTime(0)
        setDuration(0)
        setIsPaused(false)
      }

      // Create new audio element for new song
      const audio = new Audio(`/api/local-music?filename=${filename}&userAddress=${userAddress}`)
      audio.preload = 'metadata'
      
      // Set up event handlers
      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
      }

      const handleLoadedData = () => {
        audio.play().catch(err => {
          console.error('Play error:', err)
          alert('Failed to play audio file')
          cleanup()
        })
        setPlayingFile(filename)
        setAudioElement(audio)
        setIsPaused(false)
      }

      const handleEnded = () => {
        // Auto-play next track
        const currentIndex = musicFiles.findIndex(f => f.filename === filename)
        if (currentIndex !== -1 && currentIndex < musicFiles.length - 1) {
          const nextTrack = musicFiles[currentIndex + 1]
          console.log(`🎵 Auto-playing next track: ${nextTrack.title}`)
          togglePlayPause(nextTrack.filename)
        } else {
          console.log('🎵 Playlist ended')
          cleanup()
        }
      }

      const handleError = (e: Event) => {
        console.error('Audio error:', e)
        // Only show alert if we're actually trying to play this file
        if (playingFile === filename || !playingFile) {
          alert('Failed to load audio file')
        }
        cleanup()
      }

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadeddata', handleLoadedData)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        setPlayingFile(null)
        setAudioElement(null)
        setCurrentTime(0)
        setDuration(0)
        setIsPaused(false)
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('loadeddata', handleLoadedData)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)

    } catch (error) {
      console.error('Error playing music:', error)
      alert('Failed to play music')
    }
  }

  const playNext = () => {
    if (!playingFile) return
    
    const currentIndex = musicFiles.findIndex(f => f.filename === playingFile)
    if (currentIndex !== -1 && currentIndex < musicFiles.length - 1) {
      const nextTrack = musicFiles[currentIndex + 1]
      togglePlayPause(nextTrack.filename)
    }
  }

  const playPrevious = () => {
    if (!playingFile) return
    
    const currentIndex = musicFiles.findIndex(f => f.filename === playingFile)
    if (currentIndex > 0) {
      const prevTrack = musicFiles[currentIndex - 1]
      togglePlayPause(prevTrack.filename)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || !duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    
    audioElement.currentTime = newTime
    setCurrentTime(newTime)
  }

  const downloadMusic = (filename: string, title: string) => {
    const link = document.createElement('a')
    link.href = `/api/local-music?filename=${filename}&userAddress=${userAddress}`
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <Music className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl text-quantum text-orange-500">{t('musicLibrary.title')}</h3>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading your tracks...</p>
        </div>
      </div>
    )
  }

  if (musicFiles.length === 0) {
    return (
      <div className="card-quantum">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
              <Music className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl text-quantum text-orange-500">{t('musicLibrary.title')}</h3>
            
            {/* Generation Timer */}
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500 rounded-lg animate-pulse">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <span className="text-blue-400 font-mono text-sm">
                  Wait {formatTime(generationTime)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center glow-orange mx-auto mb-4">
            <Music className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <p className="text-gray-400 text-quantum text-base sm:text-lg">
            {userAddress ? 'No tracks generated yet' : 'Connect your wallet to see your music'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {userAddress ? 'Generate your first quantum soundtrack!' : 'Use MetaMask or connect via wallet button above'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <Music className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl text-quantum text-orange-500">{t('musicLibrary.title')}</h3>
          
          {/* Generation Timer */}
          {isGenerating && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500 rounded-lg animate-pulse">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <span className="text-blue-400 font-mono text-sm font-bold">
                Wait {formatTime(generationTime)}
              </span>
            </div>
          )}
          
          {/* Info button for mobile */}
          <button
            onClick={() => setShowStorageInfo(!showStorageInfo)}
            className="sm:hidden w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center hover:bg-orange-700 transition-colors"
            aria-label="Storage information"
          >
            <Info className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg glow-orange">
          <span className="text-white text-quantum text-sm sm:text-base">{musicFiles.length} {t('musicLibrary.tracks')}</span>
        </div>
      </div>

      {/* Storage Notice - Desktop: Always visible, Mobile: Toggle popup */}
      <div className="hidden sm:block mb-4 sm:mb-6 bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg p-3 sm:p-4">
        <p className="text-orange-300 text-xs sm:text-sm text-center">
          ⏰ {t('musicLibrary.storageWarningText')}
        </p>
      </div>

      {/* Mobile popup */}
      {showStorageInfo && (
        <div className="sm:hidden mb-4 relative">
          <div className="bg-orange-900 bg-opacity-95 border-2 border-orange-500 rounded-lg p-4 shadow-lg animate-fadeIn">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <h4 className="text-orange-300 text-sm">Storage Policy</h4>
              </div>
              <button
                onClick={() => setShowStorageInfo(false)}
                className="text-orange-300 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-orange-200 text-xs leading-relaxed">
              ⏰ {t('musicLibrary.storageWarningText')}
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {musicFiles.map((file) => (
          <div key={file.filename} className="bg-gradient-to-r from-gray-900 to-black border-2 border-gray-800 rounded-lg p-3 sm:p-4 hover:border-orange-500 transition-all duration-300 group">
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
              <div className="flex-1 w-full sm:w-auto">
                <h4 className="text-quantum text-orange-500 text-base sm:text-lg group-hover:text-orange-400 transition-colors">
                  {file.title}
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 mt-2 text-quantum break-words">
                  <span className="text-orange-600">▸</span> {file.style} • {formatFileSize(file.size)} • {formatDate(file.timestamp)}
                </p>
                {file.lyrics && (
                  <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-orange-900 pl-3">
                    "{file.lyrics.substring(0, 100)}{file.lyrics.length > 100 ? '...' : ''}"
                  </p>
                )}
                
                <div className="mt-3 flex items-center space-x-2 flex-wrap">
                  <span className="text-xs text-green-500 flex items-center bg-green-950 px-2 py-1 rounded">
                    <Volume2 className="h-3 w-3 mr-1" />
                    {t('musicLibrary.ready')}
                  </span>
                  {playingFile === file.filename && !isPaused && (
                    <span className="text-xs text-orange-500 flex items-center animate-pulse">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-ping"></span>
                      PLAYING
                    </span>
                  )}
                  {playingFile === file.filename && isPaused && (
                    <span className="text-xs text-yellow-500 flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                      PAUSED
                    </span>
                  )}
                </div>
                
                {/* Progress bar and time display */}
                {playingFile === file.filename && duration > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{formatTime(Math.floor(currentTime))}</span>
                      <span>{formatTime(Math.floor(duration))}</span>
                    </div>
                    <div 
                      className="w-full bg-gray-800 rounded-full h-3 cursor-pointer hover:h-4 transition-all group"
                      onClick={handleSeek}
                      title="Click to seek"
                    >
                      <div 
                        className="bg-gradient-to-r from-orange-600 to-red-600 h-full rounded-full transition-all duration-200 relative"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 w-full sm:w-auto sm:ml-4">
                {/* Previous Track Button */}
                {playingFile === file.filename && (
                  <button
                    onClick={playPrevious}
                    disabled={musicFiles.findIndex(f => f.filename === playingFile) === 0}
                    className="flex-1 sm:flex-none p-2.5 sm:p-3 bg-gray-800 hover:bg-gray-700 text-orange-500 border border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300 transform active:scale-95 sm:hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Track"
                  >
                    <SkipBack className="h-4 w-4 mx-auto" />
                  </button>
                )}
                
                {/* Play/Pause Button */}
                <button
                  onClick={() => togglePlayPause(file.filename)}
                  className="flex-1 sm:flex-none p-2.5 sm:p-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 sm:hover:scale-110 glow-orange"
                  title={playingFile === file.filename && !isPaused ? 'Pause' : 'Play'}
                >
                  {playingFile === file.filename && !isPaused ? (
                    <Pause className="h-5 w-5 mx-auto" />
                  ) : (
                    <Play className="h-5 w-5 mx-auto" />
                  )}
                </button>
                
                {/* Next Track Button */}
                {playingFile === file.filename && (
                  <button
                    onClick={playNext}
                    disabled={musicFiles.findIndex(f => f.filename === playingFile) === musicFiles.length - 1}
                    className="flex-1 sm:flex-none p-2.5 sm:p-3 bg-gray-800 hover:bg-gray-700 text-orange-500 border border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300 transform active:scale-95 sm:hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Track"
                  >
                    <SkipForward className="h-4 w-4 mx-auto" />
                  </button>
                )}
                
                {/* Download Button */}
                <button
                  onClick={() => downloadMusic(file.filename, file.title)}
                  className="flex-1 sm:flex-none p-2.5 sm:p-3 bg-gray-800 hover:bg-gray-700 text-orange-500 border border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300 transform active:scale-95 sm:hover:scale-110"
                  title="Download MP3"
                >
                  <Download className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
