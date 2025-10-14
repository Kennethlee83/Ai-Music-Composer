import axios from 'axios'
import FormData from 'form-data'

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'

export interface IPFSUploadResult {
  ipfsHash: string
  audioUrl: string
}

export async function uploadToIPFS(
  audioUrl: string, 
  params: { userAddress: string; title: string; style: string }
): Promise<IPFSUploadResult> {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      console.warn('Pinata credentials not configured, using mock IPFS hash')
      return createMockIPFSResult(params.title)
    }

    // Download the audio file from Suno with authentication
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'WeAD-Music-Platform/1.0',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY || 'b71b02c7d53af5da4ab6afa66bcebc29'}`
      }
    })

    // Create FormData for Pinata upload
    const formData = new FormData()
    const audioBuffer = Buffer.from(audioResponse.data)
    const filename = `${params.userAddress}_${params.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    
    formData.append('file', audioBuffer, {
      filename: filename,
      contentType: 'audio/mpeg'
    })
    
    // Add metadata
    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        title: params.title,
        style: params.style,
        composer: params.userAddress,
        platform: 'WeAD Music Platform'
      }
    })
    formData.append('pinataMetadata', metadata)

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
      wrapWithDirectory: false
    })
    formData.append('pinataOptions', options)

    // Upload to Pinata
    const uploadResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY,
        },
        timeout: 120000 // 2 minutes timeout
      }
    )

    if (uploadResponse.data.IpfsHash) {
      const ipfsHash = uploadResponse.data.IpfsHash
      const audioUrl = `${IPFS_GATEWAY}${ipfsHash}`
      
      console.log(`✅ Successfully uploaded to IPFS: ${ipfsHash}`)
      
      return {
        ipfsHash,
        audioUrl
      }
    } else {
      throw new Error('No IPFS hash returned from Pinata')
    }

  } catch (error) {
    console.error('❌ IPFS upload error:', error)
    console.warn('Falling back to mock IPFS hash')
    return createMockIPFSResult(params.title)
  }
}

function createMockIPFSResult(title: string): IPFSUploadResult {
  // Create a deterministic mock hash for development
  const mockHash = `QmMock${Buffer.from(title).toString('hex').substring(0, 40)}`
  const mockUrl = `https://mock-ipfs.io/ipfs/${mockHash}`
  
  console.log(`🔧 Using mock IPFS hash: ${mockHash}`)
  
  return {
    ipfsHash: mockHash,
    audioUrl: mockUrl
  }
}

export function getIPFSUrl(ipfsHash: string): string {
  return `${IPFS_GATEWAY}${ipfsHash}`
}

export async function downloadFromIPFS(ipfsHash: string): Promise<Blob> {
  const url = getIPFSUrl(ipfsHash)
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WeAD-Music-Platform/1.0',
      'Authorization': `Bearer ${process.env.SUNO_API_KEY || 'b71b02c7d53af5da4ab6afa66bcebc29'}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to download from IPFS: ${response.statusText}`)
  }
  
  return response.blob()
}
