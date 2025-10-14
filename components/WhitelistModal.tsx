'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface WhitelistModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WhitelistModal({ isOpen, onClose }: WhitelistModalProps) {
  const [formData, setFormData] = useState({
    walletAddress: '',
    email: '',
    telegram: '',
    twitter: '',
    name: '',
    country: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Send to API
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Whitelist registration successful:', formData)
        setSubmitted(true)
        
        // Reset and close after 2 seconds
        setTimeout(() => {
          setSubmitted(false)
          setFormData({
            walletAddress: '',
            email: '',
            telegram: '',
            twitter: '',
            name: '',
            country: ''
          })
          onClose()
        }, 2000)
      } else {
        alert('Registration failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Whitelist registration error:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-orange-500 rounded-xl p-8 shadow-2xl glow-orange max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-orange-500 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {submitted ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-3xl text-quantum text-orange-500 mb-4">Registration Successful!</h2>
            <p className="text-gray-300">You're now on the WeAD Token whitelist!</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl text-quantum text-orange-500 mb-3 text-center">Whitelist Registration</h2>
            <p className="text-center text-gray-400 mb-6">
              Apply to win WeAD Tokens - our platform's payment currency launching soon!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                  Wallet Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({...formData, walletAddress: e.target.value})}
                  placeholder="0x..."
                  className="input-quantum"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your@email.com"
                  className="input-quantum"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                    Telegram <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData({...formData, telegram: e.target.value})}
                    placeholder="@username"
                    className="input-quantum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                    X (Twitter) <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                    placeholder="@username"
                    className="input-quantum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                    Name <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your name"
                    className="input-quantum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-quantum text-orange-500 mb-2">
                    Country <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Your country"
                    className="input-quantum"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-quantum w-full text-lg py-4 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Join Whitelist</span>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                <span className="text-red-500">*</span> Required fields. Other fields are optional.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
