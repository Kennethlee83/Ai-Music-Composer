import { promises as fs } from 'fs'
import path from 'path'
import axios from 'axios'
import { sanitizeFilename, sanitizePath } from './security'

const GENERATED_MUSIC_FOLDER = 'generated_music'
const SUNO_API_KEY = process.env.SUNO_API_KEY || 'b71b02c7d53af5da4ab6afa66bcebc29'
const MUSIC_EXPIRY_TIME = 48 * 60 * 60 * 1000 // 48 hours in milliseconds

export interface LocalMusicFile {
  filename: string
  filepath: string
  title: string
  style: string
  lyrics?: string
  timestamp: number
  size: number
}

/**
 * Clean up expired music files (older than 48 hours) for a specific user
 */
async function cleanupExpiredMusic(userAddress: string): Promise<void> {
  try {
    // Sanitize user address to prevent path traversal
    const sanitizedAddress = sanitizePath(userAddress)
    const userFolder = path.join(GENERATED_MUSIC_FOLDER, sanitizedAddress)
    
    try {
      await fs.access(userFolder)
    } catch {
      return // Folder doesn't exist, nothing to clean up
    }

    const files = await fs.readdir(userFolder)
    const now = Date.now()

    for (const file of files) {
      if (file.endsWith('.mp3') || file.endsWith('.json')) {
        const filepath = path.join(userFolder, file)
        const stats = await fs.stat(filepath)
        const fileAge = now - stats.mtimeMs

        if (fileAge > MUSIC_EXPIRY_TIME) {
          await fs.unlink(filepath)
          console.log(`🗑️ Deleted expired file: ${file} (${Math.round(fileAge / (60 * 60 * 1000))} hours old)`)
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired music:', error)
  }
}

export async function saveMusicToLocal(
  audioUrl: string,
  params: { userAddress: string; title: string; style: string; lyrics?: string }
): Promise<LocalMusicFile> {
  try {
    // Sanitize user address to prevent path traversal
    const sanitizedAddress = sanitizePath(params.userAddress)
    
    // Create user-specific directory
    const userFolder = path.join(GENERATED_MUSIC_FOLDER, sanitizedAddress)
    
    try {
      await fs.access(userFolder)
    } catch {
      await fs.mkdir(userFolder, { recursive: true })
    }

    // Clean up old files (48 hours) for this user
    await cleanupExpiredMusic(params.userAddress)

    // Sanitize filename to prevent path traversal and invalid characters
    const cleanTitle = sanitizeFilename(params.title)
    
    // If multiple songs with same title, add a simple number
    let filename = `${cleanTitle}.mp3`
    let filepath = path.join(userFolder, filename)
    
    // Check if file exists and add number if needed
    let counter = 1
    while (await fs.access(filepath).then(() => true).catch(() => false)) {
      filename = `${cleanTitle} ${counter}.mp3`
      filepath = path.join(userFolder, filename)
      counter++
    }

    const timestamp = Date.now()

    console.log(`Downloading audio from ${audioUrl} to ${filepath}`)

    // Download the audio file from Suno with authentication
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'WeAD-Music-Platform/1.0',
        'Authorization': `Bearer ${SUNO_API_KEY}`
      }
    })

    // Save the file to local disk
    await fs.writeFile(filepath, response.data)

    // Get file stats
    const stats = await fs.stat(filepath)
    const size = stats.size

    console.log(`File saved successfully: ${filepath} (${(size / 1024 / 1024).toFixed(2)} MB)`)

    // Clean up style input (take first part before comma, keep it readable)
    const cleanStyle = params.style
      .split(',')[0]  // Take first part before comma
      .trim()
      .toLowerCase()

    // Save metadata to a JSON file
    const metadataFile = filepath.replace('.mp3', '.json')
    const metadata = {
      title: params.title,
      style: cleanStyle,
      lyrics: params.lyrics || '',
      timestamp,
      userAddress: params.userAddress
    }
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))

    return {
      filename,
      filepath,
      title: params.title,
      style: cleanStyle,
      lyrics: params.lyrics || '',
      timestamp,
      size
    }

  } catch (error) {
    console.error('Error saving music to local storage:', error)
    throw new Error('Failed to save music to local storage')
  }
}

/**
 * Get music files for a specific user
 */
export async function getLocalMusicFiles(userAddress?: string): Promise<LocalMusicFile[]> {
  try {
    if (!userAddress) {
      return [] // No user address, return empty array
    }

    // Sanitize user address to prevent path traversal
    const sanitizedAddress = sanitizePath(userAddress)
    const userFolder = path.join(GENERATED_MUSIC_FOLDER, sanitizedAddress)
    
    try {
      await fs.access(userFolder)
    } catch {
      return [] // User folder doesn't exist
    }

    // Clean up expired files before listing
    await cleanupExpiredMusic(userAddress)

    const files = await fs.readdir(userFolder)
    const musicFiles: LocalMusicFile[] = []

    for (const file of files) {
      if (file.endsWith('.mp3')) {
        const filepath = path.join(userFolder, file)
        const stats = await fs.stat(filepath)
        
        // Try to read metadata from JSON file
        const metadataFile = filepath.replace('.mp3', '.json')
        let title, style, lyrics, timestamp
        
        try {
          const metadataContent = await fs.readFile(metadataFile, 'utf-8')
          const metadata = JSON.parse(metadataContent)
          title = metadata.title
          style = metadata.style
          lyrics = metadata.lyrics || ''
          timestamp = metadata.timestamp
        } catch {
          // Fallback to filename parsing for old files
          const parts = file.replace('.mp3', '').split('_')
          timestamp = parseInt(parts[parts.length - 1]) || Date.now()
          title = parts.slice(0, -1).join('_').replace(/_/g, ' ')
          style = 'Generated' // Default style for old files
          lyrics = '' // No lyrics for old files
        }

        musicFiles.push({
          filename: file,
          filepath,
          title,
          style,
          lyrics,
          timestamp,
          size: stats.size
        })
      }
    }

    // Sort by timestamp (newest first)
    return musicFiles.sort((a, b) => b.timestamp - a.timestamp)

  } catch (error) {
    console.error('Error reading local music files:', error)
    return []
  }
}

/**
 * Get a specific music file for a user
 */
export async function getLocalMusicFile(userAddress: string, filename: string): Promise<Buffer | null> {
  try {
    // Sanitize inputs to prevent path traversal
    const sanitizedAddress = sanitizePath(userAddress)
    const sanitizedFilename = sanitizeFilename(filename)
    
    const userFolder = path.join(GENERATED_MUSIC_FOLDER, sanitizedAddress)
    const filepath = path.join(userFolder, sanitizedFilename)
    
    try {
      await fs.access(filepath)
    } catch {
      return null
    }

    return await fs.readFile(filepath)

  } catch (error) {
    console.error('Error reading local music file:', error)
    return null
  }
}