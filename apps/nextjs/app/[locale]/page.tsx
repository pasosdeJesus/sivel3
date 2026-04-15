import Link from 'next/link';

// Landing page internacionalizada para SIVeL 3
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isSpanish = locale === 'es';
  
  const content = {
    title: isSpanish ? 'SIVeL 3' : 'SIVeL 3',
    subtitle: isSpanish 
      ? 'Un protocolo Web3 para la documentación ética y sostenible de la violencia sociopolítica.'
      : 'A Web3 protocol for the ethical and sustainable documentation of socio-political violence.',
    description: isSpanish
      ? 'SIVeL 3 permite documentar casos de violencia, donar por región, y certificar la verdad en la blockchain de Celo.'
      : 'SIVeL 3 enables documenting cases of violence, donating by region, and certifying truth on the Celo blockchain.',
    buttonText: isSpanish ? 'Ver Mapa Interactivo →' : 'View Interactive Map →',
    supportedRegions: isSpanish ? 'Regiones apoyadas: Colombia, Israel/Palestina' : 'Supported regions: Colombia, Israel/Palestine',
    donationInfo: isSpanish 
      ? '🔗 Las donaciones apoyan equipos locales de documentación'
      : '🔗 Donations support local documentation teams',
    footer: isSpanish
      ? 'SIVeL 3 es un proyecto de código abierto de Pasos de Jesús. Licencia ISC.'
      : 'SIVeL 3 is an open-source project by Pasos de Jesús. Licensed under ISC.'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {content.title}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {content.subtitle}
          </p>
          <p className="text-lg text-gray-500 mb-8">
            {content.description}
          </p>
          
          <div className="space-y-4">
            <Link 
              href={`/${locale}/cases/osmmap`}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {content.buttonText}
            </Link>
            
            <div className="text-sm text-gray-500 mt-6">
              <p>{content.supportedRegions}</p>
              <p className="mt-2">{content.donationInfo}</p>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400">
            <p>{content.footer}</p>
            <p className="mt-1">
              <a href="https://gitlab.com/pasosdeJesus/sivel3" className="underline">GitLab</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
