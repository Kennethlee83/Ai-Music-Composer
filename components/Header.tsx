'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Music, Wallet, Settings } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">WeAD Music</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#generate" className="text-gray-600 hover:text-primary-600 transition-colors">
              Generate
            </a>
            <a href="#my-music" className="text-gray-600 hover:text-primary-600 transition-colors">
              My Music
            </a>
            <a href="#marketplace" className="text-gray-600 hover:text-primary-600 transition-colors">
              Marketplace
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}


