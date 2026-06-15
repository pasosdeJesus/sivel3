'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LandingPageProps {
  locale?: string;
}

export function LandingPage({ locale: propLocale }: LandingPageProps) {
  const params = useParams();
  // Si no se pasa locale por prop, usar el de la URL
  const locale = propLocale || (params?.locale as string) || 'en';
  const isSpanish = locale === 'es';

  const content = {
    title: 'SIVeL 3',
    badge: isSpanish ? 'Beta' : 'Beta',
    subtitle: isSpanish 
      ? 'Protocolo Web3 para la documentación ética de la violencia sociopolítica'
      : 'Web3 Protocol for Ethical Documentation of Socio-Political Violence',
    description: isSpanish
      ? 'SIVeL 3 empodera a ciudadanos, documentadores y validadores para crear un registro inmutable y transparente de casos de violencia, financiado mediante donaciones regionales en la red Celo.'
      : 'SIVeL 3 empowers citizens, documenters, and validators to create an immutable, transparent record of violence cases, funded by regional donations on the Celo network.',
    incentives: isSpanish
      ? '✨ Donantes verificados reciben SLEARN cashback. ✨ Ciudadanos que reportan alertas verificadas reciben recompensas en USDT.'
      : '✨ Verified donors earn SLEARN cashback. ✨ Citizens who submit verified alerts earn USDT rewards.',
    stats: {
      cases: isSpanish ? 'Casos documentados' : 'Documented Cases',
      regions: isSpanish ? 'Regiones activas' : 'Active Regions',
      donations: isSpanish ? 'Donaciones (USDT)' : 'Donations (USDT)',
    },
    buttonText: isSpanish ? 'Explorar el Mapa →' : 'Explore the Map →',
    secondaryButton: isSpanish ? 'Saber más' : 'Learn more',
    supportedRegions: isSpanish ? 'Regiones: Colombia, Israel/Palestina' : 'Regions: Colombia, Israel/Palestine',
    donationInfo: isSpanish 
      ? '🔗 Las donaciones apoyan directamente equipos locales de documentación'
      : '🔗 Donations directly support local documentation teams',
    footer: isSpanish
      ? 'SIVeL 3 es un proyecto de código abierto de Pasos de Jesús · Licencia ISC'
      : 'SIVeL 3 is an open-source project by Pasos de Jesús · ISC License',
    howItWorks: isSpanish ? 'Cómo funciona' : 'How it works',
    step1Title: isSpanish ? '1. Explora el mapa' : '1. Explore the map',
    step1Desc: isSpanish 
      ? 'Visualiza casos documentados de violencia sociopolítica en regiones activas.'
      : 'View documented cases of socio-political violence in active regions.',
    step2Title: isSpanish ? '2. Conecta tu wallet' : '2. Connect your wallet',
    step2Desc: isSpanish
      ? 'Usa MiniPay, MetaMask o OneKey para donar USDT y apoyar la documentación.'
      : 'Use MiniPay, MetaMask, or OneKey to donate USDT and support documentation.',
    step3Title: isSpanish ? '3. Dona por región' : '3. Donate by region',
    step3Desc: isSpanish
      ? 'Los fondos se distribuyen automáticamente a documentadores y validadores.'
      : 'Funds are automatically distributed to documenters and validators.',
    blockchain: isSpanish
      ? 'Todo registro es certificado en la blockchain de Celo, garantizando inmutabilidad y transparencia.'
      : 'Every record is certified on the Celo blockchain, ensuring immutability and transparency.',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-4">
            {content.badge}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {content.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-6">
            {content.subtitle}
          </p>
          <p className="text-lg text-gray-500 mb-6 max-w-2xl mx-auto">
            {content.description}
          </p>
          
          {/* Incentivos */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-10 max-w-2xl mx-auto">
            <p className="text-md text-gray-700 font-medium">
              {content.incentives}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              href={`/${locale}/cases/osmmap`}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
            >
              {content.buttonText}
            </Link>
            <a 
              href="https://gitlab.com/pasosdeJesus/sivel3"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              {content.secondaryButton}
            </a>
          </div>
        </div>

        {/* Stats - casos y regiones */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">~500</div>
            <div className="text-gray-600 mt-2">{content.stats.cases}</div>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">2</div>
            <div className="text-gray-600 mt-2">{content.stats.regions}</div>
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{content.howItWorks}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🗺️</div>
              <h3 className="font-semibold text-lg mb-2">{content.step1Title}</h3>
              <p className="text-gray-600 text-sm">{content.step1Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🔗</div>
              <h3 className="font-semibold text-lg mb-2">{content.step2Title}</h3>
              <p className="text-gray-600 text-sm">{content.step2Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">❤️</div>
              <h3 className="font-semibold text-lg mb-2">{content.step3Title}</h3>
              <p className="text-gray-600 text-sm">{content.step3Desc}</p>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-10 italic">
            {content.blockchain}
          </p>
        </div>

        {/* Footer simplificado */}
        <div className="max-w-4xl mx-auto mt-20 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">{content.footer}</p>
          <p className="text-xs text-gray-400 mt-2">{content.supportedRegions} · {content.donationInfo}</p>
        </div>
      </main>
    </div>
  );
}