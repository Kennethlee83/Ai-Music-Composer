'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Send, DollarSign, Tag } from 'lucide-react'

interface ChatMessage {
  id: string
  walletAddress: string
  displayName: string
  avatar?: string
  message: string
  timestamp: number
  type: 'message' | 'trade_offer' | 'sale_listing'
  metadata?: {
    trackId?: string
    trackTitle?: string
    price?: string
    currency?: 'WeAD' | 'BNB'
    offerTo?: string
  }
}

interface CommunityChatProps {
  walletAddress: string | null
  displayName: string
}

export function CommunityChat({ walletAddress, displayName }: CommunityChatProps) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      loadMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/community/chat')
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!walletAddress) {
      alert('Please connect your wallet to chat')
      return
    }

    if (!newMessage.trim()) return

    // Use provided display name or default to 'Anonymous'
    const finalDisplayName = displayName || 'Anonymous'

    try {
      setSending(true)
      const response = await fetch('/api/community/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          displayName: finalDisplayName || 'Anonymous',
          message: newMessage.trim(),
          type: 'message'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNewMessage('')
        loadMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    if (!chatContainerRef.current) return
    
    const container = chatContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    
    // Only auto-scroll if user is already near the bottom (within 100px)
    // This prevents disrupting users who are reading old messages
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    
    if (isNearBottom) {
      // Scroll the container internally, NOT the entire page
      container.scrollTop = scrollHeight
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const isOwnMessage = (msg: ChatMessage) => {
    return walletAddress && msg.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  }

  if (loading) {
    return (
      <div className="card-quantum">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4 text-quantum">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-quantum">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center glow-orange">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl sm:text-2xl text-quantum text-orange-500">{t('community.communityChat')}</h3>
        <div className="flex-1"></div>
        <div className="px-3 py-1 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
          <span className="text-green-400 text-xs font-bold">{messages.length} {t('community.messages')}</span>
        </div>
      </div>

      {/* Trade Info Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 border-2 border-blue-500 rounded-lg p-3 mb-4">
        <p className="text-blue-300 text-sm text-center">
          <DollarSign className="inline h-4 w-4 mr-1" />
          {t('community.chatWelcome')}
        </p>
      </div>

      {/* Messages Area */}
      <div ref={chatContainerRef} className="bg-gray-900 bg-opacity-50 border-2 border-gray-800 rounded-lg p-4 mb-4 h-[600px] overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-quantum">No messages yet</p>
            <p className="text-sm text-gray-500 mt-2">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2 ${isOwnMessage(msg) ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}
              >
                {/* Profile Avatar */}
                <div className="flex-shrink-0">
                  {msg.avatar ? (
                    <img
                      src={msg.avatar}
                      alt={msg.displayName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-orange-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center border-2 border-orange-500">
                      <span className="text-white text-xs font-bold">
                        {msg.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage(msg)
                      ? 'bg-gradient-to-br from-orange-600 to-red-600'
                      : msg.type === 'sale_listing'
                      ? 'bg-gradient-to-br from-green-900 to-emerald-900 border-2 border-green-500'
                      : 'bg-gray-800'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isOwnMessage(msg) ? 'text-orange-200' : 'text-orange-500'}`}>
                      {isOwnMessage(msg) ? 'You' : msg.displayName}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Sale Listing */}
                  {msg.type === 'sale_listing' && msg.metadata && (
                    <div className="bg-black bg-opacity-30 rounded p-2 mb-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <Tag className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400 font-bold">FOR SALE</span>
                      </div>
                      <p className="text-sm font-bold text-white">{msg.metadata.trackTitle}</p>
                      <p className="text-xs text-gray-400">{msg.metadata.price} {msg.metadata.currency}</p>
                    </div>
                  )}

                  {/* Message Text */}
                  <p className={`text-sm ${isOwnMessage(msg) ? 'text-white' : 'text-gray-200'}`}>
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      {!walletAddress ? (
        <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">Connect your wallet to join the chat</p>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('community.typeMessage')}
            className="flex-1 px-4 py-3 bg-gray-900 border-2 border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
            maxLength={500}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-300 transform active:scale-95 hover:scale-105 glow-orange disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      )}
    </div>
  )
}

