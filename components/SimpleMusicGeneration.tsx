'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Music, Loader2, Coins, HelpCircle } from 'lucide-react'

interface MusicParams {
  style: string
  title: string
  lyrics: string
  instrumental: boolean
  musicStyle: string
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export function SimpleMusicGeneration() {
  const { t } = useTranslation()
  const [params, setParams] = useState<MusicParams>({
    style: '',
    title: '',
    lyrics: '',
    instrumental: false,
    musicStyle: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [paymentType, setPaymentType] = useState<'BNB' | 'USDC' | 'WeAD'>('BNB')
  const [ethPrice, setEthPrice] = useState<string>('...')
  const [credits, setCredits] = useState<number>(0)
  const [offChainCredits, setOffChainCredits] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [fingerprint, setFingerprint] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet is connected
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        })
    }
    
    // Fetch current BNB price
    fetchETHPrice()
    
    // Fetch user credits when account changes
    if (account) {
      fetchUserCredits()
      fetchFingerprintCredits()
    }
    
    // Listen for new user welcome event
    const handleNewUser = (event: any) => {
      if (event.detail) {
        console.log('🎉 New user detected, fetching credits...')
        setOffChainCredits(event.detail.offChainCredits || 1)
        // Refresh on-chain credits too
        fetchUserCredits()
      }
    }
    
    window.addEventListener('newUserWelcome', handleNewUser)
    
    return () => {
      window.removeEventListener('newUserWelcome', handleNewUser)
    }
  }, [account])

  const fetchETHPrice = async () => {
    try {
      console.log('🔍 Fetching real BNB price from CoinGecko...')
      
      // Fetch BNB price from our CoinGecko API
      const response = await fetch('/api/bnb-price')
      const data = await response.json()
      
      if (data.success && data.bnbPerCredit) {
        console.log('✅ BNB Price from CoinGecko: $' + data.bnbPriceUSD + ' USD')
        console.log('✅ BNB per credit: ' + data.bnbPerCredit + ' BNB')
        setEthPrice(data.bnbPerCredit)
      } else {
        throw new Error('Invalid response from BNB price API')
      }
    } catch (error) {
      console.error('❌ Error fetching BNB price from CoinGecko:', error)
      // Use conservative fallback: Assuming BNB = $600, $0.10 / $600 = 0.000167 BNB
      console.log('⚠️ Using fallback BNB price')
      setEthPrice('0.00016667')
    }
  }

  const fetchUserCredits = async () => {
    try {
      if (!account) return
      
      const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS
      // Skip if contract not deployed (zero address or not set)
      if (!PAYMENT_ADDRESS || PAYMENT_ADDRESS === '0x0000000000000000000000000000000000000000') return

      const { ethers } = await import('ethers')
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/')
      
      const PAYMENT_ABI = [
        "function userCredits(address user) external view returns (uint256)"
      ]
      
      const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, provider)
      const userCredits = await paymentContract.userCredits(account)
      setCredits(Number(userCredits))
    } catch (error) {
      console.error('Error fetching on-chain credits:', error)
      setCredits(0)
    }
  }

  // Fetch fingerprint-based credits
  const fetchFingerprintCredits = async () => {
    try {
      // Wait for fingerprint to be generated
      let attempts = 0
      while (!window.userFingerprint && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!window.userFingerprint) {
        console.log('⚠️ Digital fingerprint not ready, skipping off-chain credits check')
        return
      }

      const fp = window.userFingerprint
      setFingerprint(fp)

      const response = await fetch(`/api/fingerprint-credits?fingerprint=${fp}&wallet=${account}`)
      const data = await response.json()

      if (data.success) {
        setOffChainCredits(data.offChainCredits || 0)
        console.log(`🎁 Fingerprint credits loaded: ${data.offChainCredits} OFF-CHAIN`)
        
        if (data.isNewUser) {
          console.log('🎉 NEW USER - Credits auto-granted!')
        }
      }
    } catch (error) {
      console.error('Error fetching fingerprint credits:', error)
      setOffChainCredits(0)
    }
  }


  const buyCredits = async () => {
    if (!account) {
      alert('Please connect your wallet first')
      return
    }

    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS

      // Check if contract is deployed (not zero address)
      if (!PAYMENT_ADDRESS || PAYMENT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        alert('⚠️ Music Payment contracts are currently being deployed to BSC Mainnet.\n\nPlease check back soon! The platform will be live shortly.')
        return
      }

      // Buy credits with BNB
      if (paymentType === 'BNB') {
        const PAYMENT_ABI = [
          "function buyCreditsWithETH(uint256 quantity) external payable"
        ]

        const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, signer)

        let totalRequired: bigint
        
        try {
          // Get current BNB price from CoinGecko
          const priceResponse = await fetch('/api/bnb-price')
          const priceData = await priceResponse.json()
          
          if (priceData.success && priceData.bnbPerCredit) {
            const bnbPerCredit = ethers.parseEther(priceData.bnbPerCredit)
            totalRequired = bnbPerCredit * BigInt(quantity)
            console.log('✅ Using CoinGecko price: $' + priceData.bnbPriceUSD + ' USD')
            console.log('✅ Total required:', ethers.formatEther(totalRequired), 'BNB for', quantity, 'credits')
          } else {
            throw new Error('Failed to fetch BNB price')
          }
        } catch (error) {
          console.log('⚠️ Could not fetch CoinGecko price, using fallback estimate')
          // Fallback: Assuming BNB = $600, $0.10 / $600 = 0.000167 BNB
          const estimatedPerSong = ethers.parseEther('0.00016667')
          totalRequired = estimatedPerSong * BigInt(quantity)
          console.log('⚠️ Using fallback:', ethers.formatEther(totalRequired), 'BNB total')
        }

        // Check BNB balance
        const balance = await provider.getBalance(account)
        if (balance < totalRequired) {
          alert(`Insufficient BNB balance. You need ${ethers.formatEther(totalRequired)} BNB (~$${(quantity * 0.10).toFixed(2)})`)  
          return
        }

        // Process payment with BNB
        console.log(`Buying ${quantity} credits for ${ethers.formatEther(totalRequired)} BNB...`)
        const tx = await paymentContract.buyCreditsWithETH(quantity, {
          value: totalRequired
        })
        await tx.wait()

        alert(`✅ Success! You purchased ${quantity} song credits!`)
        fetchUserCredits()
        return
      }

      // Buy credits with USDC
      if (paymentType === 'USDC') {
        const USDC_ABI = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function balanceOf(address account) external view returns (uint256)"
        ]

        const PAYMENT_ABI = [
          "function buyCreditsWithUSDC(uint256 quantity) external",
          "function musicGenerationPrice() external view returns (uint256)"
        ]

        const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS

        if (!USDC_ADDRESS) {
          alert('USDC not configured')
          return
        }

        const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, signer)
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer)

        // Get price
        const pricePerSong = await paymentContract.musicGenerationPrice()
        const totalRequired = pricePerSong * BigInt(quantity)

        // Check USDC balance
        const balance = await usdcContract.balanceOf(account)
        if (balance < totalRequired) {
          alert(`Insufficient USDC balance. You need ${ethers.formatUnits(totalRequired, 6)} USDC`)
          return
        }

        // Approve USDC spending
        console.log('Approving USDC spending...')
        const approveTx = await usdcContract.approve(PAYMENT_ADDRESS, totalRequired)
        await approveTx.wait()

        // Process payment
        console.log(`Buying ${quantity} credits...`)
        const tx = await paymentContract.buyCreditsWithUSDC(quantity)
        await tx.wait()

        alert(`✅ Success! You purchased ${quantity} song credits!`)
        fetchUserCredits()
      }

    } catch (error: any) {
      console.error('Credit purchase error:', error)
      
      let errorMsg = ''
      
      // User-friendly error messages
      if (error.code === 4001) {
        errorMsg = '❌ Transaction cancelled by user'
      } else if (error.code === 'ACTION_REJECTED') {
        errorMsg = '❌ Transaction rejected in MetaMask'
      } else if (error.code === 'UNKNOWN_ERROR' || error.code === -32603 || error.message?.includes('missing trie node')) {
        errorMsg = '⚠️ Wallet Connection Issue\n\n' +
                   'Please reconnect your wallet:\n' +
                   '1. Click "Disconnect" button\n' +
                   '2. Click "Connect Wallet" again\n' +
                   '3. Make sure you\'re on BSC Mainnet\n' +
                   '4. Try purchasing again'
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = '❌ Insufficient BNB for gas fees\n\nPlease add more BNB to your wallet.'
      } else if (error.message?.includes('user rejected')) {
        errorMsg = '❌ Transaction rejected in MetaMask'
      } else if (error.message?.includes('missing revert data') || error.code === 'CALL_EXCEPTION') {
        errorMsg = '⚠️ Contract Error\n\n' +
                   'This could mean:\n' +
                   '• Your wallet is not properly connected\n' +
                   '• You\'re on the wrong network (need BSC Mainnet)\n' +
                   '• The blockchain is experiencing issues\n\n' +
                   'Please disconnect and reconnect your wallet, then try again.'
      } else if (error.message?.includes('Internal JSON-RPC error')) {
        errorMsg = '⚠️ Network Connection Issue\n\n' +
                   'The blockchain network is having trouble responding.\n' +
                   'Please wait a moment and try again.'
      } else if (error.message?.includes('could not coalesce error')) {
        errorMsg = '⚠️ Wallet Not Connected Properly\n\n' +
                   'Please disconnect and reconnect your wallet:\n' +
                   '1. Click "Disconnect"\n' +
                   '2. Click "Connect Wallet"\n' +
                   '3. Ensure you\'re on BSC Mainnet'
      } else {
        errorMsg = '❌ Purchase Failed\n\n' + (error.shortMessage || error.message || 'Unknown error occurred. Please try again.')
      }
      
      alert(errorMsg)
    }
  }

  const useCredit = async () => {
    if (!account) {
      alert('Please connect your wallet first')
      return false
    }

    if (credits === 0) {
      alert('You have no credits. Please buy credits first.')
      return false
    }

    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS

      if (!PAYMENT_ADDRESS) {
        console.log('Contract not configured, allowing generation')
        return true
      }

      const PAYMENT_ABI = [
        "function useCredit(string memory title, string memory style) external"
      ]

      const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, signer)

      console.log('Using 1 credit...')
      // Show informative message to user
      console.info('📝 Confirming credit usage on blockchain (only gas fees, no payment needed)')
      
      // Note: This requires a transaction to record credit usage on blockchain
      // Users pay only gas fees (no payment for the song itself)
      const tx = await paymentContract.useCredit(params.title, params.musicStyle)
      await tx.wait()

      console.log('Credit used successfully!')
      fetchUserCredits()
      return true

    } catch (error: any) {
      console.error('Credit use error:', error)
      if (error.code === 4001) {
        alert('Transaction cancelled')
      } else {
        alert('Failed to use credit: ' + (error.message || 'Unknown error'))
      }
      return false
    }
  }

  const processPayment = async () => {
    // Priority 1: Use off-chain credits first (no gas fees!)
    if (offChainCredits > 0) {
      console.log('🎁 Using off-chain credit (FREE - no gas!)')
      return await useOffChainCredit()
    }
    
    // Priority 2: Use on-chain credits (requires gas)
    if (credits > 0) {
      console.log('💎 Using on-chain credit (requires gas)')
      return await useCredit()
    }

    alert('You have no credits. Please buy credits first using the "Buy Credits" button below.')
    return false
  }

  const useOffChainCredit = async () => {
    try {
      if (!fingerprint) {
        console.error('❌ Digital fingerprint not available')
        alert('Please refresh the page and try again')
        return false
      }

      console.log('💳 Using fingerprint-based free credit...')
      
      const response = await fetch('/api/fingerprint-credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, amount: 1 })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ OFF-CHAIN credit used! Remaining:', data.remainingCredits)
        setOffChainCredits(data.remainingCredits)
        return true
      } else {
        console.error('❌ Failed to use off-chain credit:', data.error)
        alert('Failed to use off-chain credit: ' + data.error)
        return false
      }
    } catch (error) {
      console.error('Error using off-chain credit:', error)
      alert('Failed to use off-chain credit')
      return false
    }
  }

  const generateMusic = async () => {
    if (!account) {
      alert('Please connect your wallet first to generate music')
      return
    }

    setIsGenerating(true)
    // Notify LocalMusicPlayer that generation started
    window.dispatchEvent(new Event('musicGenerationStart'))
    
    try {
      // Step 1: Process payment
      const paymentSuccess = await processPayment()
      if (!paymentSuccess) {
        setIsGenerating(false)
        window.dispatchEvent(new Event('musicGenerationComplete'))
        return
      }

      // Step 2: Generate music with Suno AI
      // Create an AbortController with a 15-minute timeout (music takes 5-10 mins)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000) // 15 minutes
      
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          style: params.musicStyle,
          lyrics: params.lyrics,
          instrumental: params.instrumental,
          userAddress: account
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Server returned non-JSON response:', contentType)
        const textResponse = await response.text()
        console.error('Response preview:', textResponse.substring(0, 500))
        
        // Even though API response failed, the music might have been generated successfully
        // Show a user-friendly message and refresh
        alert('⏳ Music generation is taking longer than expected.\n\n' +
              '✅ Your music might have been generated successfully!\n\n' +
              '🔄 Please refresh your page to see if your new tracks appear in "My Music Library".\n\n' +
              'If your music doesn\'t appear and your credit was deducted, it will be automatically refunded.')
        
        // Auto-refresh the music list after 2 seconds
        setTimeout(() => {
          window.dispatchEvent(new Event('musicGenerationComplete'))
        }, 2000)
        
        setIsGenerating(false)
        return
      }
      
      const result = await response.json()
      
      if (result.success) {
        const totalSongs = result.musicData.totalSongs || 1
        const savedFiles = result.musicData.allLocalFiles || [result.musicData.localFile]
        
        let message = `✅ Payment successful! Music generated!\n\n`
        message += `📁 ${totalSongs} track(s) created:\n`
        
        savedFiles.forEach((file: any) => {
          message += `• ${file.filename}\n`
        })
        
        message += `\nYou can now play and download your music!`
        
        alert(message)
        // Notify completion - LocalMusicPlayer will refresh files
        window.dispatchEvent(new Event('musicGenerationComplete'))
      } else {
        // Check if credit was refunded
        if (result.refunded) {
          let message = '⚠️ ' + result.error
          if (result.refundTxHash) {
            message += '\n\n📝 Refund Transaction: ' + result.refundTxHash
          }
          alert(message)
          // Auto-refresh credits to show the refund immediately
          fetchUserCredits()
          fetchFingerprintCredits()
        } else {
          alert('Music generation failed: ' + result.error)
        }
        window.dispatchEvent(new Event('musicGenerationComplete'))
      }
    } catch (error: any) {
      console.error('Error generating music:', error)
      
      // If request was aborted due to timeout, music might still be generating
      if (error.name === 'AbortError') {
        alert('⏱️ Request timeout - but don\'t worry!\n\nYour music is still being generated in the background.\n\nPlease wait a few minutes and refresh the page to see your new tracks.')
      } else {
        alert('Error generating music: ' + (error.message || 'Unknown error'))
      }
      
      window.dispatchEvent(new Event('musicGenerationComplete'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generateMusic()
  }

  return (
    <div className="card-quantum" style={{ paddingTop: '1.9rem', paddingBottom: '1.9rem' }}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
          <Music className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl text-quantum text-orange-500">{t('musicGeneration.title')}</h3>
      </div>
      
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Credits Display */}
            <div className="bg-black border-2 border-orange-500 rounded-lg p-4 text-center glow-orange">
              <p className="text-sm text-quantum text-orange-400 mb-2">{t('musicGeneration.yourCredits')}</p>
              
              {/* Always show breakdown when any credits exist */}
              {(offChainCredits > 0 || credits > 0) ? (
                <div className="space-y-2 mb-2">
                  {/* Off-Chain Credits */}
                  {offChainCredits > 0 && (
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-green-400 text-2xl font-bold">{offChainCredits}</span>
                        <div className="text-left">
                          <p className="text-xs text-green-300 font-semibold">OFF-CHAIN</p>
                          <p className="text-[0.65rem] text-green-500">Free • No Gas</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* On-Chain Credits */}
                  {credits > 0 && (
                    <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-2 border-blue-500 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-blue-400 text-2xl font-bold">{credits}</span>
                        <div className="text-left">
                          <p className="text-xs text-blue-300 font-semibold">ON-CHAIN</p>
                          <p className="text-[0.65rem] text-blue-500">Paid • Gas Required</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Total */}
                  <p className="text-xs text-gray-400 mt-1">
                    Total: <span className="text-orange-400 font-bold">{offChainCredits + credits}</span> {(offChainCredits + credits) === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-quantum text-gray-500 mb-2">0</p>
              )}
              
              <div className="mt-2 inline-block bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500 px-3 py-1 rounded-lg">
                <span className="text-green-400 font-bold text-xs">💎 1 CREDIT = 2 SONGS</span>
              </div>
            </div>

            {/* Buy Credits Section */}
            <div className="bg-black bg-opacity-50 rounded-lg border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-quantum text-orange-500 uppercase tracking-wide">
                  Buy Credits
                </label>
                <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500 px-3 py-1 rounded-lg">
                  <span className="text-green-400 font-bold text-xs">💎 1 CREDIT = 2 SONGS</span>
                </div>
              </div>
              
              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">{t('musicGeneration.numberOfSongs')}</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 border border-orange-500 rounded-lg text-orange-500 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center input-quantum"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 border border-orange-500 rounded-lg text-orange-500 font-bold"
                  >
                    +
                  </button>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-quantum text-gray-300">
                      Total: <span className="text-orange-500 font-bold">${(quantity * 0.10).toFixed(2)}</span>
                    </p>
                    {paymentType === 'BNB' && ethPrice !== '...' && (
                      <p className="text-xs text-gray-500">
                        ≈ {(parseFloat(ethPrice) * quantity).toFixed(6)} BNB
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">{t('musicGeneration.paymentMethod')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType('BNB')}
                    className={`py-2 px-3 rounded-lg transition-all duration-300 text-sm text-quantum ${
                      paymentType === 'BNB'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white glow-orange'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500'
                    }`}
                  >
                    BNB
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('USDC')}
                    className={`py-2 px-3 rounded-lg transition-all duration-300 text-sm text-quantum ${
                      paymentType === 'USDC'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white glow-orange'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500'
                    }`}
                  >
                    USDC
                  </button>
                </div>
              </div>

              {/* WEAD Token Coming Soon Notice */}
              <div className="mb-3 p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500 rounded-lg">
                <p className="text-xs text-blue-400 text-center">
                  ⏰ <strong>{t('musicGeneration.comingSoonWeadTokens')}</strong><br/>
                  {t('musicGeneration.weadTokensPromo')}
                </p>
              </div>

              {/* Buy Button */}
              <button
                type="button"
                onClick={buyCredits}
                className="btn-quantum w-full text-lg py-3 flex items-center justify-center"
              >
                <Coins className="mr-2 h-5 w-5" />
                <span>BUY {quantity} CREDIT{quantity > 1 ? 'S' : ''} - ${(quantity * 0.10).toFixed(2)}</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2 uppercase tracking-wide">
                {t('musicGeneration.songTitle')}
              </label>
              <input
                type="text"
                value={params.title}
                onChange={(e) => setParams({...params, title: e.target.value})}
                placeholder={t('musicGeneration.titlePlaceholder')}
                className="input-quantum"
                required
              />
            </div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm font-semibold text-quantum text-orange-500 uppercase tracking-wide">
              {t('musicGeneration.musicStyle')}
            </label>
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-orange-500 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 bg-black border-2 border-orange-500 rounded-lg p-4 text-xs text-gray-300 z-50 shadow-lg">
                <p className="font-bold text-orange-500 mb-2">Popular Music Styles:</p>
                <p className="mb-1">• <strong>Pop:</strong> Catchy, upbeat, mainstream</p>
                <p className="mb-1">• <strong>Rock:</strong> Electric guitars, drums, energetic</p>
                <p className="mb-1">• <strong>Jazz:</strong> Smooth, improvisational, brass</p>
                <p className="mb-1">• <strong>Electronic:</strong> Synth, EDM, dance beats</p>
                <p className="mb-1">• <strong>Hip Hop:</strong> Rap, beats, urban</p>
                <p className="mb-1">• <strong>Classical:</strong> Orchestra, piano, timeless</p>
                <p className="mb-1">• <strong>Lo-fi:</strong> Chill, relaxing, study beats</p>
                <p className="mb-1">• <strong>Metal:</strong> Heavy, distorted, intense</p>
                <p className="mt-2 text-orange-400">💡 Mix styles: "Chill Lo-fi Jazz with Piano"</p>
              </div>
            </div>
          </div>
          <textarea
            value={params.musicStyle}
            onChange={(e) => setParams({...params, musicStyle: e.target.value})}
            placeholder="e.g., 'Chill Lo-fi Jazz with soft piano and smooth beats' or 'Energetic Electronic Rock with heavy synths'"
            rows={4}
            maxLength={1000}
            className="input-quantum resize-none"
            required
          />
          <p className="text-xs text-gray-500 mt-2 text-quantum">
            ✨ Up to 1000 characters. Be creative with your style combinations!
          </p>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm font-semibold text-quantum text-orange-500 uppercase tracking-wide">
              {t('musicGeneration.lyrics')}
            </label>
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-orange-500 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 bg-black border-2 border-orange-500 rounded-lg p-4 text-xs text-gray-300 z-50 shadow-lg">
                <p className="font-bold text-orange-500 mb-2">How to Structure Lyrics:</p>
                <p className="mb-1">• <strong>[Verse 1]</strong> Your first verse lyrics...</p>
                <p className="mb-1">• <strong>[Chorus]</strong> Catchy chorus lyrics...</p>
                <p className="mb-1">• <strong>[Verse 2]</strong> Second verse lyrics...</p>
                <p className="mb-1">• <strong>[Bridge]</strong> Bridge section...</p>
                <p className="mb-1">• <strong>[Outro]</strong> Ending lyrics...</p>
                <p className="mt-2 text-orange-400">💡 Use brackets to separate sections!</p>
                <p className="mt-1">Example:</p>
                <p className="italic mt-1">[Verse 1]<br/>Walking down the street<br/>[Chorus]<br/>This is my beat!</p>
              </div>
            </div>
          </div>
          <textarea
            value={params.lyrics}
            onChange={(e) => setParams({...params, lyrics: e.target.value})}
            placeholder="[Verse 1]&#10;Walking through the city lights&#10;Feeling alive in the night&#10;&#10;[Chorus]&#10;This is my soundtrack tonight&#10;Everything feels so right"
            rows={12}
            maxLength={3000}
            className="input-quantum resize-none"
            required={!params.instrumental}
          />
          <p className="text-xs text-gray-400 mt-2 text-quantum">
            ✨ Up to 3000 characters.
          </p>
        </div>

        <div className="flex items-center space-x-3 p-4 bg-black bg-opacity-50 rounded-lg border border-gray-800">
          <input
            type="checkbox"
            id="instrumental"
            checked={params.instrumental}
            onChange={(e) => setParams({...params, instrumental: e.target.checked})}
            className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-600 rounded bg-black"
          />
          <label htmlFor="instrumental" className="text-sm text-quantum text-gray-300 cursor-pointer">
            🎹 Instrumental Only (No Vocals)
          </label>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="btn-quantum w-full text-lg py-4 flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin mr-3 h-5 w-5" />
              <span>{t('musicGeneration.generating')}</span>
            </>
          ) : (
            <>
              <Music className="mr-3 h-5 w-5" />
              <span>{t('musicGeneration.generateButton')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
