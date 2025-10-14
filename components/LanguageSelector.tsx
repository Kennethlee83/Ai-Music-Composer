'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import '../lib/i18n' // Initialize i18n

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'tl', name: 'Filipino', flag: '🇵🇭' }
  ]

  useEffect(() => {
    // Set initial language from i18n
    setCurrentLanguage(i18n.language)

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [i18n.language])

  const changeLanguage = (languageCode: string) => {
    console.log('🌍 Changing language to:', languageCode)
    
    // Change language using i18next (instant, no reload needed!)
    i18n.changeLanguage(languageCode)
    setCurrentLanguage(languageCode)
    
    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', languageCode)
    
    // Close dropdown
    setIsOpen(false)
    
    console.log('✅ Language changed successfully!')
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0]

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 99999 }}>
      {/* Desktop Button - Matches Community/Marketplace sizing */}
      <button
        onClick={toggleDropdown}
        className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border-2
                 bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-400 text-gray-900
                 hover:from-yellow-500 hover:to-yellow-400 hover:border-yellow-300
                 transition-all duration-200 transform hover:scale-105"
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="hidden lg:inline text-xs font-bold">{currentLang.name}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mobile Button */}
      <button
        onClick={toggleDropdown}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg
                 bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900 font-bold text-sm
                 hover:from-yellow-500 hover:to-yellow-400
                 transition-all duration-200 transform hover:scale-105"
        style={{ zIndex: 99999 }}
      >
        {currentLang.flag}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Dark backdrop for mobile */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 99998 }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div
            className="absolute left-0 right-0 md:left-auto md:right-auto top-full mt-2
                     bg-gray-900 border-2 border-yellow-500 rounded-xl shadow-2xl
                     max-h-[60vh] overflow-hidden flex flex-col"
            style={{ 
              zIndex: 99999,
              width: '280px',
              maxWidth: '100vw'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b border-yellow-500 flex justify-between items-center bg-gradient-to-r from-gray-800 to-gray-900">
              <h3 className="text-yellow-400 font-bold text-lg">Select Language</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Language List */}
            <div 
              className="overflow-y-auto p-3"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left mb-2
                           transition-all duration-200 transform hover:scale-102
                           border-2
                           ${currentLanguage === lang.code
                             ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900 font-bold border-yellow-400 shadow-lg'
                             : 'text-white hover:bg-gray-800 border-gray-700 hover:border-yellow-500'
                           }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="flex-1 text-base font-medium">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <span className="text-gray-900 text-2xl font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
