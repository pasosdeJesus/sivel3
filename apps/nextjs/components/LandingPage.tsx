'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

const landingTranslations = {
  en: {
    badge: 'Beta',
    subtitle: 'Web3 Protocol for Ethical Documentation of Socio-Political Violence',
    description: 'SIVeL 3 empowers citizens, documenters, and validators to create an immutable, transparent record of violence cases, funded by regional donations on the Celo network.',
    statsCases: 'Documented Cases',
    statsRegions: 'Active Regions',
    statsDonations: 'Donations (USDT)',
    buttonText: 'Explore the Map →',
    secondaryButton: 'Learn more',
    supportedRegions: 'Regions: Colombia, Israel/Palestine',
    donationInfo: '🔗 Donations directly support local documentation teams',
    footer: 'SIVeL 3 is an open-source project by Pasos de Jesús · ISC License',
    howItWorks: 'How it works',
    step1Title: '1. Explore the map',
    step1Desc: 'View documented cases of socio-political violence in active regions.',
    step2Title: '2. Connect your wallet',
    step2Desc: 'Use MiniPay, MetaMask or OneKey to donate USDT and support documentation.',
    step3Title: '3. Donate by region',
    step3Desc: 'Funds are automatically distributed to documenters and validators.',
    blockchain: 'Every record is certified on the Celo blockchain, ensuring immutability and transparency.',
  },
  es: {
    badge: 'Beta',
    subtitle: 'Protocolo Web3 para la documentación ética de la violencia sociopolítica',
    description: 'SIVeL 3 empodera a ciudadanos, documentadores y validadores para crear un registro inmutable y transparente de casos de violencia, financiado mediante donaciones regionales en la red Celo.',
    statsCases: 'Casos documentados',
    statsRegions: 'Regiones activas',
    statsDonations: 'Donaciones (USDT)',
    buttonText: 'Explorar el Mapa →',
    secondaryButton: 'Saber más',
    supportedRegions: 'Regiones: Colombia, Israel/Palestina',
    donationInfo: '🔗 Las donaciones apoyan directamente equipos locales de documentación',
    footer: 'SIVeL 3 es un proyecto de código abierto de Pasos de Jesús · Licencia ISC',
    howItWorks: 'Cómo funciona',
    step1Title: '1. Explora el mapa',
    step1Desc: 'Visualiza casos documentados de violencia sociopolítica en regiones activas.',
    step2Title: '2. Conecta tu wallet',
    step2Desc: 'Usa MiniPay, MetaMask o OneKey para donar USDT y apoyar la documentación.',
    step3Title: '3. Dona por región',
    step3Desc: 'Los fondos se distribuyen automáticamente a documentadores y validadores.',
    blockchain: 'Todo registro es certificado en la blockchain de Celo, garantizando inmutabilidad y transparencia.',
  }
};

interface LandingPageProps {
  locale?: 'en' | 'es';
}

export function LandingPage({ locale: propLocale }: LandingPageProps) {
  const { t, locale } = useTranslation(landingTranslations, propLocale);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-4">
            {t('badge')}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            SIVeL 3
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-6">
            {t('subtitle')}
          </p>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
            {t('description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              href={`/${locale}/cases/osmmap`}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
            >
              {t('buttonText')}
            </Link>
            <a 
              href="https://gitlab.com/pasosdeJesus/sivel3"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              {t('secondaryButton')}
            </a>
          </div>
        </div>

        {/* Stats - casos y regiones */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">~500</div>
            <div className="text-gray-600 mt-2">{t('statsCases')}</div>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">2</div>
            <div className="text-gray-600 mt-2">{t('statsRegions')}</div>
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🗺️</div>
              <h3 className="font-semibold text-lg mb-2">{t('step1Title')}</h3>
              <p className="text-gray-600 text-sm">{t('step1Desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🔗</div>
              <h3 className="font-semibold text-lg mb-2">{t('step2Title')}</h3>
              <p className="text-gray-600 text-sm">{t('step2Desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">❤️</div>
              <h3 className="font-semibold text-lg mb-2">{t('step3Title')}</h3>
              <p className="text-gray-600 text-sm">{t('step3Desc')}</p>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-10 italic">
            {t('blockchain')}
          </p>
        </div>

        {/* Footer simplificado */}
        <div className="max-w-4xl mx-auto mt-20 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">{t('footer')}</p>
          <p className="text-xs text-gray-400 mt-2">{t('supportedRegions')} · {t('donationInfo')}</p>
        </div>
      </main>
    </div>
  );
}