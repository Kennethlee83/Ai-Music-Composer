'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2, Music, Trash2, DollarSign } from 'lucide-react'

interface LocalMusicFile {
  filename: string
  filepath: string
  title: string
  style: string
  lyrics?: string
  timestamp: number
  size: number
}

interface SharedTrack {
  id: string
  walletAddress: string
  displayName: string
  title: string
  style: string
  description: string
  filename: string
  sharedAt: number
}

interface MusicSharingProps {
  walletAddress: string
  displayName: string
  onMusicShared: () => void
}

export function MusicSharing({ walletAddress, displayName, onMusicShared }: MusicSharingProps) {
  const { t } = useTranslation()
  const [musicFiles, setMusicFiles] = useState<LocalMusicFile[]>([])
  const [sharedTracks, setSharedTracks] = useState<SharedTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<LocalMusicFile | null>(null)
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadMusicFiles()
    loadSharedTracks()
  }, [walletAddress])

  const loadMusicFiles = async () => {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/local-music?userAddress=${walletAddress}&t=${timestamp}`)
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

  const loadSharedTracks = async () => {
    try {
      const response = await fetch(`/api/community/share-music?address=${walletAddress}`)
      const data = await response.json()
      
      if (data.success) {
        setSharedTracks(data.tracks)
      }
    } catch (error) {
      console.error('Error loading shared tracks:', error)
    }
  }

  const shareTrack = async () => {
    if (!selectedTrack) return

    // Use provided display name or default to 'Anonymous'
    const finalDisplayName = displayName || 'Anonymous'

    try {
      setSharing(true)
      const response = await fetch('/api/community/share-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          displayName: finalDisplayName || 'Anonymous',
          title: selectedTrack.title,
          style: selectedTrack.style,
          lyrics: selectedTrack.lyrics,
          description,
          filename: selectedTrack.filename,
          filepath: selectedTrack.filepath,
          size: selectedTrack.size
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Track shared successfully!')
        setSelectedTrack(null)
        setDescription('')
        loadSharedTracks()
        onMusicShared()
      } else {
        alert('Failed to share track')
      }
    } catch (error) {
      console.error('Error sharing track:', error)
      alert('Error sharing track')
    } finally {
      setSharing(false)
    }
  }

  const unshareTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to unshare this track?')) return

    try {
      const response = await fetch(`/api/community/share-music?id=${trackId}&address=${walletAddress}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Track unshared successfully!')
        loadSharedTracks()
        onMusicShared()
      } else {
        alert('Failed to unshare track')
      }
    } catch (error) {
      console.error('Error unsharing track:', error)
      alert('Error unsharing track')
    }
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading your music...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Share New Track */}
      <div className="card-quantum">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl text-quantum text-orange-500">{t('community.shareYourMusic')}</h3>
        </div>

        {musicFiles.length === 0 ? (
          <div className="text-center py-8">
            <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-quantum">No music to share yet</p>
            <p className="text-sm text-gray-500 mt-2">Generate some music first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 text-quantum mb-2">{t('community.selectTrack')}</label>
              <select
                value={selectedTrack?.filename || ''}
                onChange={(e) => {
                  const track = musicFiles.find(f => f.filename === e.target.value)
                  setSelectedTrack(track || null)
                }}
                className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
              >
                <option value="">-- Select a track --</option>
                {musicFiles.map((file) => (
                  <option key={file.filename} value={file.filename}>
                    {file.title} ({file.style})
                  </option>
                ))}
              </select>
            </div>

            {selectedTrack && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 text-quantum mb-2">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell the community about this track..."
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                    rows={3}
                    maxLength={300}
                  />
                </div>

                <button
                  onClick={shareTrack}
                  disabled={sharing}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 glow-orange disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="font-bold text-quantum">{sharing ? 'Sharing...' : 'Share to Community'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Your Shared Tracks */}
      {sharedTracks.length > 0 && (
        <div className="card-quantum">
          <h4 className="text-lg font-bold text-quantum text-orange-500 mb-4">{t('community.yourSharedTracks')} ({sharedTracks.length})</h4>
          
          <div className="space-y-3">
            {sharedTracks.map((track) => (
              <div key={track.id} className="bg-gradient-to-r from-gray-900 to-black border-2 border-gray-800 rounded-lg p-4 hover:border-orange-500 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-bold text-orange-500 text-quantum">{track.title}</h5>
                    <p className="text-sm text-gray-400 mt-1">{track.style}</p>
                    {track.description && (
                      <p className="text-sm text-gray-500 mt-2 italic">"{track.description}"</p>
                    )}
                    <p className="text-xs text-gray-600 mt-2">
                      {t('community.sharedLabel')} {new Date(track.sharedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => listForSale(track)}
                      className="p-2 bg-green-900 hover:bg-green-800 text-green-400 rounded-lg transition-all"
                      title="List for sale"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => unshareTrack(track.id)}
                      className="p-2 bg-red-900 hover:bg-red-800 text-red-400 rounded-lg transition-all"
                      title="Unshare track"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  async function listForSale(track: SharedTrack) {
    const price = prompt('Enter price in WeAD tokens (e.g., 1.0):')
    if (!price || isNaN(parseFloat(price))) {
      return
    }

    // Use provided display name or default to 'Anonymous'
    const finalDisplayName = displayName || 'Anonymous'

    try {
      const response = await fetch('/api/community/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          displayName: finalDisplayName || 'Anonymous',
          trackId: track.id,
          trackTitle: track.title,
          trackStyle: track.style,
          filename: track.filename,
          price,
          currency: 'WeAD'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Post to chat
        await fetch('/api/community/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            displayName: finalDisplayName || 'Anonymous',
            message: `🎵 Listed "${track.title}" for sale!`,
            type: 'sale_listing',
            metadata: {
              trackId: track.id,
              trackTitle: track.title,
              price,
              currency: 'WeAD'
            }
          })
        })

        alert('Track listed for sale! Check the community feed.')
      }
    } catch (error) {
      console.error('Error listing for sale:', error)
      alert('Failed to list track')
    }
  }
}

