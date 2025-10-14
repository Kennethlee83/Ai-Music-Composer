'use client'

import { useState, useEffect } from 'react'
import { Wallet, Download, DollarSign, Users, TrendingUp } from 'lucide-react'

export default function AdminPage() {
  const [account, setAccount] = useState<string | null>(null)
  const [contractBalance, setContractBalance] = useState<string>('0')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [totalPayments, setTotalPayments] = useState(0)

  useEffect(() => {
    checkWallet()
  }, [])

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          loadContractBalance(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0])
        loadContractBalance(accounts[0])
      } catch (error) {
        console.error('Error connecting wallet:', error)
      }
    }
  }

  const loadContractBalance = async (userAccount: string) => {
    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)

      const USDC_ABI = [
        "function balanceOf(address account) external view returns (uint256)"
      ]

      const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS
      const PAYMENT_CONTRACT = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS

      if (!USDC_ADDRESS || !PAYMENT_CONTRACT) {
        console.log('Contract addresses not configured')
        return
      }

      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
      const balance = await usdcContract.balanceOf(PAYMENT_CONTRACT)
      const formattedBalance = ethers.formatUnits(balance, 6) // USDC has 6 decimals
      
      setContractBalance(formattedBalance)
      
      // Calculate total payments (each payment is $0.10)
      const payments = Math.floor(parseFloat(formattedBalance) / 0.10)
      setTotalPayments(payments)

    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const withdrawFunds = async () => {
    if (!account) {
      alert('Please connect your wallet first')
      return
    }

    setIsWithdrawing(true)
    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const PAYMENT_ABI = [
        "function withdrawTokens(address token, uint256 amount) external",
        "function owner() external view returns (address)"
      ]

      const USDC_ABI = [
        "function balanceOf(address account) external view returns (uint256)"
      ]

      const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS
      const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS

      if (!USDC_ADDRESS || !PAYMENT_ADDRESS) {
        alert('Contract addresses not configured')
        setIsWithdrawing(false)
        return
      }

      const paymentContract = new ethers.Contract(PAYMENT_ADDRESS, PAYMENT_ABI, signer)
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)

      // Check if user is owner
      const owner = await paymentContract.owner()
      if (owner.toLowerCase() !== account.toLowerCase()) {
        alert('Only the contract owner can withdraw funds')
        setIsWithdrawing(false)
        return
      }

      // Get contract balance
      const balance = await usdcContract.balanceOf(PAYMENT_ADDRESS)
      
      if (balance === 0n) {
        alert('No funds to withdraw')
        setIsWithdrawing(false)
        return
      }

      // Withdraw
      console.log('Withdrawing', ethers.formatUnits(balance, 6), 'USDC...')
      const tx = await paymentContract.withdrawTokens(USDC_ADDRESS, balance)
      
      console.log('Transaction sent:', tx.hash)
      alert(`Withdrawal in progress!\nTransaction: ${tx.hash}`)
      
      await tx.wait()
      
      alert(`✅ Success! ${ethers.formatUnits(balance, 6)} USDC withdrawn to your wallet!`)
      
      // Reload balance
      loadContractBalance(account)

    } catch (error: any) {
      console.error('Withdrawal error:', error)
      if (error.code === 4001) {
        alert('Transaction cancelled')
      } else {
        alert('Withdrawal failed: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <div className="min-h-screen quantum-gradient relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-700 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl heading-quantum mb-2">ADMIN DASHBOARD</h1>
            <p className="text-gray-400">Manage your WeAD Music platform</p>
          </div>
          
          {!account ? (
            <button onClick={connectWallet} className="btn-quantum flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </button>
          ) : (
            <div className="card-quantum px-4 py-2">
              <p className="text-xs text-gray-400">Connected</p>
              <p className="text-sm text-quantum text-orange-500 font-bold">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {account ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Contract Balance */}
            <div className="card-quantum">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <button 
                  onClick={() => loadContractBalance(account)}
                  className="text-xs text-orange-500 hover:text-orange-400"
                >
                  🔄 Refresh
                </button>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Contract Balance</h3>
              <p className="text-3xl font-bold text-quantum text-white">
                ${contractBalance}
              </p>
              <p className="text-xs text-gray-500 mt-1">USDC</p>
            </div>

            {/* Total Payments */}
            <div className="card-quantum">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Total Payments</h3>
              <p className="text-3xl font-bold text-quantum text-white">
                {totalPayments}
              </p>
              <p className="text-xs text-gray-500 mt-1">Music generations</p>
            </div>

            {/* Revenue */}
            <div className="card-quantum">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Revenue per Track</h3>
              <p className="text-3xl font-bold text-quantum text-orange-500">
                $0.10
              </p>
              <p className="text-xs text-gray-500 mt-1">Per generation</p>
            </div>
          </div>
        ) : null}

        {/* Withdrawal Section */}
        {account ? (
          <div className="card-quantum">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
                <Download className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl text-quantum text-orange-500">WITHDRAW FUNDS</h3>
            </div>

            <div className="bg-black bg-opacity-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Available to withdraw:</p>
                  <p className="text-4xl font-bold text-quantum text-white">
                    ${contractBalance} <span className="text-xl text-gray-500">USDC</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Destination:</p>
                  <p className="text-sm text-quantum text-orange-500 font-bold">
                    {account.slice(0, 10)}...{account.slice(-8)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4 mt-4">
                <p className="text-xs text-gray-500 mb-4">
                  💡 Funds will be sent to your connected MetaMask wallet. Make sure you have enough ETH for gas fees.
                </p>
              </div>
            </div>

            <button
              onClick={withdrawFunds}
              disabled={isWithdrawing || parseFloat(contractBalance) === 0}
              className="btn-quantum w-full text-lg py-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWithdrawing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  <span>WITHDRAWING...</span>
                </>
              ) : (
                <>
                  <Download className="mr-3 h-5 w-5" />
                  <span>WITHDRAW ALL FUNDS</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="card-quantum text-center py-12">
            <Wallet className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-2xl text-quantum text-orange-500 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6">Connect your wallet to access the admin dashboard</p>
            <button onClick={connectWallet} className="btn-quantum inline-flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </button>
          </div>
        )}

        {/* Contract Info */}
        <div className="card-quantum mt-6">
          <h3 className="text-lg text-quantum text-orange-500 mb-4 font-bold">CONTRACT INFORMATION</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Payment Contract:</span>
              <a 
                href={`https://sepolia.basescan.org/address/${process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-400 font-mono text-xs"
              >
                {process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS?.slice(0, 10)}...
                {process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS?.slice(-8)}
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">USDC Contract:</span>
              <a 
                href={`https://sepolia.basescan.org/address/${process.env.NEXT_PUBLIC_USDC_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-400 font-mono text-xs"
              >
                {process.env.NEXT_PUBLIC_USDC_ADDRESS?.slice(0, 10)}...
                {process.env.NEXT_PUBLIC_USDC_ADDRESS?.slice(-8)}
              </a>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Network:</span>
              <span className="text-white font-bold">Base Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
