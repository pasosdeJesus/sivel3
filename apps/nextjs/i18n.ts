import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; // Para cargar archivos JSON
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    debug: process.env.NODE_ENV === 'development',
    backend: {
      loadPath: '/locales/{{lng}}/common.json', // Ruta para tus archivos de traducción
    },
    ns: ['OSMMapPage'],
    defaultNS: 'OSMMapPage',
    load: 'all',
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: process.env.NODE_ENV === 'development' 
      ? (lng, ns, key) => console.warn(`Missing translation: ${lng}.${ns}.${key}`)
      : false
  });

export default i18n;
