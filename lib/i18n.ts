import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Only import essential languages to reduce memory during build
import en from '../locales/en.json'
import es from '../locales/es.json'
import zh from '../locales/zh-CN.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to React
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      'zh-CN': { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko }
      // Only load top 5 languages at build time
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false // React already escapes
    },
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie']
    }
  })

// Lazy load additional languages on demand
i18n.on('languageChanged', async (lng) => {
  if (!i18n.hasResourceBundle(lng, 'translation')) {
    try {
      // Fetch translation file from public folder
      const response = await fetch(`/locales/${lng}.json`)
      if (response.ok) {
        const translations = await response.json()
        i18n.addResourceBundle(lng, 'translation', translations)
      }
    } catch (error) {
      console.error(`Failed to load language: ${lng}`, error)
    }
  }
})

export default i18n

