// Firebase configuration for WeAD Music Platform
// Using same Firebase project as WeAD Dashboard
// CDN approach - same as Dashboard

export const firebaseConfig = {
  apiKey: "AIzaSyAObiLSbcGCF7OA-ZvmbQ3k9mAf9N7A87A",
  authDomain: "wead-weadvertise.firebaseapp.com",
  projectId: "wead-weadvertise",
  storageBucket: "wead-weadvertise.firebasestorage.app",
  messagingSenderId: "1048810367502",
  appId: "1:1048810367502:web:7968bda5d9ad2949c6ea5f",
  measurementId: "G-QE7NJ5FRVQ"
}

// Initialize Firebase using CDN (same as Dashboard)
export const initializeFirebase = async () => {
  if (typeof window === 'undefined') return null

  console.log('🔍 Checking for Firebase...')
  
  // Wait for Firebase to load from CDN (longer wait for mobile)
  let attempts = 0
  const maxAttempts = 300 // 30 seconds total for slow mobile connections
  while (!window.firebase && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
    
    // Log progress every 3 seconds
    if (attempts % 30 === 0) {
      console.log(`⏳ Still waiting for Firebase... (${attempts / 10}s)`)
    }
  }

  if (!window.firebase) {
    console.error('❌ Firebase not loaded from CDN after 30 seconds')
    console.error('📱 Possible causes:')
    console.error('   - Slow network connection')
    console.error('   - Script blocking (AdBlock, etc.)')
    console.error('   - Firewall blocking Google CDN')
    console.error('   - Check browser console for script load errors')
    return null
  }

  console.log('✅ Firebase CDN loaded successfully')

  try {
    // Check if already initialized
    if (!window.firebaseApp) {
      window.firebaseApp = window.firebase.initializeApp(firebaseConfig)
      console.log('✅ Firebase initialized successfully (CDN)')
    }

    if (!window.firebaseAuth) {
      window.firebaseAuth = window.firebase.auth()
    }

    if (!window.firebaseProvider) {
      window.firebaseProvider = new window.firebase.auth.GoogleAuthProvider()
    }

    return {
      auth: window.firebaseAuth,
      provider: window.firebaseProvider
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
    return null
  }
}

export const getFirebaseAuth = () => window.firebaseAuth
export const getGoogleProvider = () => window.firebaseProvider

