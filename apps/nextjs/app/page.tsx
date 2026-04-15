import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SIVeL 3
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            A Web3 protocol for the ethical and sustainable documentation of socio-political violence.
          </p>
          <p className="text-lg text-gray-500 mb-8">
            SIVeL 3 es un protocolo Web3 para la documentación ética y sostenible de la violencia sociopolítica.
          </p>
          
          <div className="space-y-4">
            <Link 
              href="/en/cases/osmmap"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Interactive Map →
            </Link>
            <div className="text-sm text-gray-500 mt-4">
              <p>Supported regions: Colombia, Israel/Palestine</p>
              <p className="mt-2">🔗 Donations support local documentation teams</p>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400">
            <p>SIVeL 3 is an open-source project by Pasos de Jesús.</p>
            <p>Licensed under ISC. All case data is public and freely accessible.</p>
          </div>
        </div>
      </main>
    </div>
  );
}