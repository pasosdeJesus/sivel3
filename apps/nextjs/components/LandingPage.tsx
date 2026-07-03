'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LandingPageProps {
  locale?: string;
}

export function LandingPage({ locale: propLocale }: LandingPageProps) {
  const params = useParams();
  const locale = propLocale || (params?.locale as string) || 'en';
  const isSpanish = locale === 'es';

  const content = {
    title: 'SIVeL 3',
    badge: isSpanish ? 'Beta en Celo' : 'Beta on Celo',
    subtitle: isSpanish
      ? 'Protocolo Web3 para la Documentación Ética de la Violencia Sociopolítica'
      : 'Web3 Protocol for Ethical Documentation of Socio-Political Violence',
    description: isSpanish
      ? 'SIVeL 3 empodera a ciudadanos, documentadores y validadores para crear un registro inmutable y transparente de casos de violencia. Nuestro agente IA detecta eventos potenciales de fuentes públicas, y los ciudadanos pueden investigar, verificar y ganar recompensas por contribuir a la verdad.'
      : 'SIVeL 3 empowers citizens, documenters, and validators to create an immutable, transparent record of violence cases. Our AI agent detects potential events from public sources, and citizens can investigate, verify, and earn rewards for contributing to the truth.',
    incentives: isSpanish
      ? '✨ Donantes verificados reciben SLEARN cashback. ✨ Ciudadanos ganan USDT por alertas verificadas.'
      : '✨ Verified donors earn SLEARN cashback. ✨ Citizens earn USDT for verified alerts.',
    stats: {
      cases: isSpanish ? 'Casos Documentados' : 'Documented Cases',
      regions: isSpanish ? 'Regiones Activas' : 'Active Regions',
    },
    buttonText: isSpanish ? 'Explorar el Mapa →' : 'Explore the Map →',
    secondaryButton: isSpanish ? 'Código Fuente' : 'Source Code',
    liveOnCelo: isSpanish ? '🌐 Operando en Celo — pagos y certificaciones on-chain, compatible con MiniPay.' : '🌐 Live on Celo — on-chain payments and certifications, with MiniPay support.',
    footer: isSpanish
      ? 'SIVeL 3 es un proyecto de código abierto de Pasos de Jesús · Licencia ISC'
      : 'SIVeL 3 is an open-source project by Pasos de Jesús · ISC License',
    howItWorks: isSpanish ? 'Cómo funciona' : 'How it works',
    step1Title: isSpanish ? '1. Agente IA 🤖' : '1. AI Agent 🤖',
    step1Desc: isSpanish
      ? 'Monitorea noticias 24/7 y genera pre-alertas estructuradas siguiendo la metodología de Noche y Niebla.'
      : 'Monitors news 24/7 and generates structured pre-alerts following the Noche y Niebla methodology.',
    step2Title: isSpanish ? '2. Investigación Ciudadana 🧑‍⚖️' : '2. Citizen Investigation 🧑‍⚖️',
    step2Desc: isSpanish
      ? 'Ciudadanos verificados compran pre-alertas por $1 USDT, las enriquecen con fuentes y detalles, y las convierten en alertas.'
      : 'Verified citizens buy pre-alerts for $1 USDT, enrich them with sources and details, and convert them into alerts.',
    step3Title: isSpanish ? '3. Revisión Documental 📋' : '3. Documenter Review 📋',
    step3Desc: isSpanish
      ? 'Documentadores expertos revisan alertas, asignan puntuación (2–5), y el ciudadano recibe ese monto en USDT automáticamente.'
      : 'Expert documenters review alerts, assign a quality score (2–5), and citizens earn that amount in USDT automatically.',
    supportedRegions: isSpanish ? 'Regiones activas: Colombia, Israel/Palestina' : 'Active regions: Colombia, Israel/Palestine',
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
          
          {/* Incentives */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
            <p className="text-md text-gray-700 font-medium">
              {content.incentives}
            </p>
          </div>

          {/* Live on Celo */}
          <p className="text-sm text-gray-400 mb-10 max-w-2xl mx-auto">
            {content.liveOnCelo}
          </p>
          
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

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-2 gap-8 text-center">
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">~500</div>
            <div className="text-gray-600 mt-2">{content.stats.cases}</div>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-600">2</div>
            <div className="text-gray-600 mt-2">{content.stats.regions}</div>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{content.howItWorks}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🤖</div>
              <h3 className="font-semibold text-lg mb-2">{content.step1Title}</h3>
              <p className="text-gray-600 text-sm">{content.step1Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🧑‍⚖️</div>
              <h3 className="font-semibold text-lg mb-2">{content.step2Title}</h3>
              <p className="text-gray-600 text-sm">{content.step2Desc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">📋</div>
              <h3 className="font-semibold text-lg mb-2">{content.step3Title}</h3>
              <p className="text-gray-600 text-sm">{content.step3Desc}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-4xl mx-auto mt-20 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">{content.footer}</p>
          <p className="text-xs text-gray-400 mt-2">{content.supportedRegions}</p>
        </div>
      </main>
    </div>
  );
}
