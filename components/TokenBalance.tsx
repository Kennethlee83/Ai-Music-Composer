'use client'

import { useAccount, useContractRead } from 'wagmi'
import { WeADTokenABI } from '@/lib/contracts'
import { formatEther } from 'viem'
import { useEffect, useState } from 'react'

export function TokenBalance() {
  const { address, isConnected } = useAccount()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const { data: balance } = useContractRead({
    address: process.env.NEXT_PUBLIC_WEAD_TOKEN_ADDRESS as `0x${string}`,
    abi: WeADTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: isConnected,
  })

  const { data: generationCost } = useContractRead({
    address: process.env.NEXT_PUBLIC_WEAD_TOKEN_ADDRESS as `0x${string}`,
    abi: WeADTokenABI,
    functionName: 'GENERATION_COST',
  })

  if (!isMounted) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">💰 Token Balance</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">💰 Token Balance</h3>
        <p className="text-gray-500">Connect your wallet to view balance</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">💰 Token Balance</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">WEAD Balance:</span>
          <span className="font-mono text-lg">
            {balance ? formatEther(balance as bigint) : '0'} WEAD
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Generation Cost:</span>
          <span className="font-mono">
            {generationCost ? formatEther(generationCost as bigint) : '10'} WEAD
          </span>
        </div>
        
        {balance && generationCost && balance < generationCost && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              ⚠️ Insufficient tokens for music generation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
