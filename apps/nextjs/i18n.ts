import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend' // Para cargar archivos JSON
import LanguageDetector from 'i18next-browser-languagedetector'
import path from 'path'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    debug: process.env.NODE_ENV === 'development',
    i18n: {
      defaultLocale: 'en',
      locales: ['en', 'es'],
      localePath: path.resolve('./public/locales'),
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Ruta para tus archivos de traducción
    },
    ns: ['common'],
    defaultNS: 'common',
    fallbackNS: 'common',
    saveMissing: process.env.NODE_ENV === 'development',
    /*missingKeyHandler: process.env.NODE_ENV === 'development' ? 
      (lng, ns, key) => console.warn(`Missing translation: ${lng}.${ns}.${key}`)
        : false,*/
    interpolation: {
      escapeValue: false, // React ya se encarga de escapar
    },
  })

export default i18n
