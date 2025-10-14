'use client'

import { useState, useEffect } from 'react'

interface GoogleUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

// Detect if running in MetaMask or mobile WebView browser
function isMetaMaskBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('metamask') || 
         (ua.includes('mobile') && window.ethereum !== undefined) ||
         ua.includes('wv') // WebView indicator
}

function isMobileBrowser() {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)
}

export function useGoogleAuth() {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [firebaseError, setFirebaseError] = useState(false)

  useEffect(() => {
    // Wait for Firebase to load from layout.tsx (ES6 modules)
    const checkFirebase = async () => {
      if (window.firebaseLoaded && window.firebaseAuth && window.firebaseProvider) {
        console.log('🎯 Firebase ready (ES6 modules)')
        setFirebaseReady(true)
        setFirebaseError(false)
        
        // Check for redirect result (for mobile/MetaMask browser)
        if (window.firebaseGetRedirectResult) {
          try {
            console.log('📱 Checking for redirect result (mobile/MetaMask)...')
            const result = await window.firebaseGetRedirectResult(window.firebaseAuth)
            if (result && result.user) {
              console.log('✅ Redirect sign-in successful:', result.user.email)
              const userData: GoogleUser = {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
              }
              setGoogleUser(userData)
              
              // Get ID token for backend
              const idToken = await result.user.getIdToken()
              // Store for backend linking
              ;(window as any).__googleAuthResult = { user: userData, idToken }
            }
          } catch (error) {
            console.warn('⚠️ Redirect result check failed:', error)
          }
        }
        
        // Check if user is already logged in
        window.firebaseOnAuthStateChanged(window.firebaseAuth, (user: any) => {
          console.log('🔄 Auth state changed:', user ? `Signed in as ${user.email}` : 'Signed out')
          if (user) {
            setGoogleUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            })
          } else {
            setGoogleUser(null)
          }
        })
      } else if (window.firebaseLoaded === false) {
        // Firebase explicitly failed to load
        console.error('❌ Firebase failed to load')
        setFirebaseError(true)
        setFirebaseReady(false)
      } else {
        // Still loading, check again
        setTimeout(checkFirebase, 100)
      }
    }
    
    // Start checking
    setTimeout(checkFirebase, 100)
  }, [])

  const signInWithGoogle = async () => {
    if (!firebaseReady || !window.firebaseLoaded) {
      console.error('❌ Firebase not ready - firebaseReady:', firebaseReady)
      console.error('❌ Window.firebaseLoaded:', window.firebaseLoaded)
      alert('Firebase is loading. Please wait a moment and try again.')
      return null
    }

    setIsGoogleLoading(true)

    try {
      const isMobileOrMetaMask = isMetaMaskBrowser() || isMobileBrowser()
      
      if (isMobileOrMetaMask) {
        // Use redirect method for mobile/MetaMask browsers
        console.log('📱 Detected mobile/MetaMask browser - using redirect flow')
        console.log('🔐 Redirecting to Google Sign-In...')
        
        await window.firebaseSignInWithRedirect(window.firebaseAuth, window.firebaseProvider)
        // User will be redirected and return to the page
        // The result will be handled in useEffect with getRedirectResult
        return null
      } else {
        // Use popup method for desktop browsers
        console.log('🖥️ Desktop browser - using popup flow')
        console.log('🔐 Opening Google Sign-In popup...')
        
        const result = await window.firebaseSignInWithPopup(window.firebaseAuth, window.firebaseProvider)
        const user = result.user

        const userData: GoogleUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }

        setGoogleUser(userData)
        console.log('✅ Google Sign-In successful:', userData)

        // Get ID token for backend verification
        const idToken = await user.getIdToken()
        
        return { user: userData, idToken }
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Sign-in cancelled. Please try again.')
      } else if (error.code === 'auth/popup-blocked') {
        alert('Popup blocked. Please allow popups for this site.')
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('⚠️ Domain not authorized.\n\nPlease add www.weadcomposer.info to authorized domains in Firebase Console:\nAuthentication → Settings → Authorized domains')
      } else {
        alert(`Failed to sign in with Google.\n\nError: ${error.message}\n\nPlease refresh the page and try again.`)
      }
      
      return null
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const signOutGoogle = async () => {
    try {
      if (window.firebaseAuth && window.firebaseSignOut) {
        await window.firebaseSignOut(window.firebaseAuth)
        setGoogleUser(null)
        console.log('✅ Google Sign-Out successful')
      }
    } catch (error) {
      console.error('❌ Google Sign-Out error:', error)
    }
  }

  return {
    googleUser,
    isGoogleLoading,
    firebaseReady,
    firebaseError,
    signInWithGoogle,
    signOutGoogle
  }
}

