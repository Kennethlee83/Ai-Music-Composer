import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import I18nProvider from '../components/I18nProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WeAD AI Composer - AI Music Generation',
  description: 'Generate AI music with blockchain technology. Create custom songs with AI, powered by Base Chain and Chainlink Oracle.',
  openGraph: {
    title: 'WeAD AI Composer - AI Music Generation',
    description: 'Generate AI music with blockchain technology. Create custom songs with AI, powered by Base Chain and Chainlink Oracle.',
    url: 'https://weadcomposer.info',
    siteName: 'WeAD AI Composer',
    images: [
      {
        url: 'https://weadcomposer.info/WeADlinkimage.png',
        width: 1200,
        height: 630,
        alt: 'WeAD AI Composer - AI Music Generation Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeAD AI Composer - AI Music Generation',
    description: 'Generate AI music with blockchain technology. Create custom songs with AI.',
    images: ['https://weadcomposer.info/WeADlinkimage.png'],
    creator: '@WeADvertizers',
  },
  icons: {
    icon: '/wead-logo.png',
    apple: '/wead-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Firebase SDK - Modern ES6 Module Approach (Same as WeAD Dashboard) */}
        <Script id="firebase-init" strategy="beforeInteractive">
          {`
            (async function() {
              try {
                console.log('🔍 Loading Firebase modules...');
                
                // Import Firebase modules (ES6)
                const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
                const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                
                // Firebase configuration
                const firebaseConfig = {
                  apiKey: "AIzaSyAObiLSbcGCF7OA-ZvmbQ3k9mAf9N7A87A",
                  authDomain: "wead-weadvertise.firebaseapp.com",
                  projectId: "wead-weadvertise",
                  storageBucket: "wead-weadvertise.firebasestorage.app",
                  messagingSenderId: "1048810367502",
                  appId: "1:1048810367502:web:7968bda5d9ad2949c6ea5f",
                  measurementId: "G-QE7NJ5FRVQ"
                };
                
                // Initialize Firebase
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const provider = new GoogleAuthProvider();
                
                // Make Firebase available globally
                window.firebaseAuth = auth;
                window.firebaseProvider = provider;
                window.firebaseSignInWithPopup = signInWithPopup;
                window.firebaseSignInWithRedirect = signInWithRedirect;
                window.firebaseGetRedirectResult = getRedirectResult;
                window.firebaseOnAuthStateChanged = onAuthStateChanged;
                window.firebaseSignOut = signOut;
                window.firebaseLoaded = true;
                
                console.log('✅ Firebase loaded successfully (ES6 modules)');
                
              } catch (error) {
                console.error('❌ Firebase loading error:', error);
                window.firebaseLoaded = false;
              }
            })();
          `}
        </Script>
        
        {/* FingerprintJS - Browser Fingerprinting for User Verification */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js"
          strategy="beforeInteractive"
        />
        <Script id="fingerprint-init" strategy="beforeInteractive">
          {`
            (async function() {
              try {
                // Wait for FingerprintJS to load
                let attempts = 0;
                while (!window.FingerprintJS && attempts < 50) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                }
                
                if (window.FingerprintJS) {
                  const fp = await window.FingerprintJS.load();
                  const result = await fp.get();
                  
                  // Store fingerprint globally
                  window.userFingerprint = result.visitorId;
                  console.log('✅ Digital fingerprint generated:', result.visitorId.substring(0, 16) + '...');
                } else {
                  console.error('❌ FingerprintJS failed to load');
                }
              } catch (error) {
                console.error('❌ Fingerprint error:', error);
              }
            })();
          `}
        </Script>
        
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}


