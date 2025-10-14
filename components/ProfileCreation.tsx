'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Save, Edit, Camera } from 'lucide-react'

interface UserProfile {
  walletAddress: string
  displayName: string
  email?: string
  bio: string
  avatar?: string
  socialLinks?: {
    twitter?: string
    discord?: string
    telegram?: string
  }
  createdAt: number
  stats: {
    tracksShared: number
    totalPlays: number
  }
}

interface FollowStats {
  followingCount: number
  followersCount: number
  following: string[]
  followers: string[]
}

interface ProfileCreationProps {
  walletAddress: string
  onProfileUpdated: (profile: UserProfile) => void
}

export function ProfileCreation({ walletAddress, onProfileUpdated }: ProfileCreationProps) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [twitter, setTwitter] = useState('')
  const [discord, setDiscord] = useState('')
  const [telegram, setTelegram] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Follow system
  const [followStats, setFollowStats] = useState<FollowStats>({
    followingCount: 0,
    followersCount: 0,
    following: [],
    followers: []
  })

  useEffect(() => {
    loadProfile()
    loadFollowStats()
  }, [walletAddress])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/community/profile?address=${walletAddress}`)
      const data = await response.json()
      
      if (data.success && data.profile) {
        setProfile(data.profile)
        setDisplayName(data.profile.displayName)
        setEmail(data.profile.email || '')
        setBio(data.profile.bio || '')
        setAvatar(data.profile.avatar || '')
        setTwitter(data.profile.socialLinks?.twitter || '')
        setDiscord(data.profile.socialLinks?.discord || '')
        setTelegram(data.profile.socialLinks?.telegram || '')
        setIsEditing(false)
      } else {
        // No profile exists
        setProfile(null)
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowStats = async () => {
    try {
      const response = await fetch(`/api/community/follow?address=${walletAddress}`)
      const data = await response.json()
      
      if (data.success) {
        setFollowStats({
          followingCount: data.followingCount || 0,
          followersCount: data.followersCount || 0,
          following: data.following || [],
          followers: data.followers || []
        })
      }
    } catch (error) {
      console.error('Error loading follow stats:', error)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB)
    if (file.size > 500000) {
      alert('Image size must be less than 500KB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatar(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    if (!displayName.trim()) {
      alert('Display name is required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/community/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          displayName: displayName.trim(),
          email: email.trim(),
          bio: bio.trim(),
          avatar: avatar || '',
          socialLinks: {
            twitter: twitter.trim(),
            discord: discord.trim(),
            telegram: telegram.trim()
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setProfile(data.profile)
        setIsEditing(false)
        onProfileUpdated(data.profile)
        alert('Profile saved successfully!')
      } else {
        alert('Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!isEditing && profile) {
    return (
      <div className="card-quantum">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
              <User className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl text-quantum text-orange-500">{t('profile.yourProfile')}</h3>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-orange-500 border-2 border-orange-900 hover:border-orange-500 rounded-lg transition-all duration-300"
          >
            <Edit className="h-4 w-4" />
            <span className="font-bold text-quantum">{t('profile.edit')}</span>
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-orange-500 glow-orange"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center border-4 border-orange-500 glow-orange">
                <User className="w-16 h-16 text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 text-quantum mb-1">{t('profile.displayName')}</p>
            <p className="text-lg text-orange-500 font-bold">{profile.displayName}</p>
          </div>

          {/* MetaMask Wallet Address */}
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 border border-green-500 rounded-lg p-4">
            <p className="text-sm text-green-300 text-quantum mb-1">🔐 MetaMask Wallet</p>
            <p className="text-sm text-green-400 font-mono break-all">{walletAddress}</p>
          </div>

          {profile.bio && (
            <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 text-quantum mb-1">{t('profile.bio')}</p>
              <p className="text-gray-300">{profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 text-quantum mb-1">{t('profile.tracksShared')}</p>
              <p className="text-2xl text-orange-500 font-bold">{profile.stats.tracksShared}</p>
            </div>
            <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 text-quantum mb-1">{t('profile.totalPlays')}</p>
              <p className="text-2xl text-orange-500 font-bold">{profile.stats.totalPlays}</p>
            </div>
          </div>

          {/* Follow Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-300 text-quantum mb-1">{t('profile.following')}</p>
              <p className="text-2xl text-blue-400 font-bold">{followStats.followingCount}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-800 rounded-lg p-4">
              <p className="text-sm text-purple-300 text-quantum mb-1">{t('profile.followers')}</p>
              <p className="text-2xl text-purple-400 font-bold">{followStats.followersCount}</p>
            </div>
          </div>

          {(profile.socialLinks?.twitter || profile.socialLinks?.discord || profile.socialLinks?.telegram) && (
            <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 text-quantum mb-3">{t('profile.socialLinks')}</p>
              <div className="space-y-2">
                {profile.socialLinks?.twitter && (
                  <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 block">
                    𝕏 Twitter/X
                  </a>
                )}
                {profile.socialLinks?.discord && (
                  <p className="text-purple-400">Discord: {profile.socialLinks.discord}</p>
                )}
                {profile.socialLinks?.telegram && (
                  <p className="text-blue-400">Telegram: {profile.socialLinks.telegram}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
          <User className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl text-quantum text-orange-500">{profile ? 'EDIT PROFILE' : 'CREATE PROFILE'}</h3>
      </div>

      <div className="space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
          <label className="block text-sm text-gray-400 text-quantum mb-3">{t('profile.profileImage')}</label>
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatar ? (
              <img
                src={avatar}
                alt="Profile Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-orange-500 glow-orange"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center border-4 border-orange-500 glow-orange">
                <User className="w-16 h-16 text-white" />
              </div>
            )}
            {/* Camera overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">Click to upload (max 500KB)</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 text-quantum mb-2">{t('profile.displayName')} *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 text-quantum mb-2">Email (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 text-quantum mb-2">{t('profile.bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community about yourself..."
            className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors resize-none"
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400 text-quantum mb-3">{t('profile.socialLinks')} (Optional)</p>
          
          <div className="space-y-3">
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="Twitter/X URL (https://x.com/...)"
              className="w-full px-4 py-2 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors text-sm"
            />
            <input
              type="text"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              placeholder="Discord username"
              className="w-full px-4 py-2 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors text-sm"
            />
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="Telegram username"
              className="w-full px-4 py-2 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors text-sm"
            />
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 glow-orange disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span className="font-bold text-quantum">{saving ? t('profile.saving') : t('profile.saveProfile')}</span>
          </button>
          
          {profile && (
            <button
              onClick={() => {
                setIsEditing(false)
                setDisplayName(profile.displayName)
                setEmail(profile.email || '')
                setBio(profile.bio || '')
              }}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all duration-300"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

