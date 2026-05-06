import { createTranslator } from '@pasosdejesus/m/i18n'

const statsTranslations = {
  en: {
    title: 'Site Statistics',
    description: 'Real-time usage analytics for sivel.xyz',
    pageViews: 'Page Views',
    uniqueSessions: 'Unique Sessions',
    uniqueWallets: 'Unique Wallets',
    uniqueIps: 'Unique IPs',
    donationConversion: 'Donation Conversion (24h)',
    errors24h: 'API Errors (24h)',
    topPages: 'Top Pages (7d)',
    path: 'Page',
    views: 'Views',
    started: 'Started',
    completed: 'Completed',
    rate: 'Rate',
    period24h: '24h',
    period7d: '7 days',
    period30d: '30 days',
    noData: 'No data yet. Analytics are collected as users interact with the site.',
  },
  es: {
    title: 'Estadísticas del Sitio',
    description: 'Analíticas de uso en tiempo real para sivel.xyz',
    pageViews: 'Vistas de Página',
    uniqueSessions: 'Sesiones Únicas',
    uniqueWallets: 'Billeteras Únicas',
    uniqueIps: 'IPs Únicas',
    donationConversion: 'Conversión de Donaciones (24h)',
    errors24h: 'Errores de API (24h)',
    topPages: 'Páginas Principales (7d)',
    path: 'Página',
    views: 'Vistas',
    started: 'Iniciadas',
    completed: 'Completadas',
    rate: 'Tasa',
    period24h: '24h',
    period7d: '7 días',
    period30d: '30 días',
    noData: 'Sin datos aún. Las analíticas se recopilan cuando los usuarios interactúan con el sitio.',
  },
}

interface SummaryData {
  pageViews: Record<string, number>
  uniqueSessions: Record<string, number>
  uniqueWallets: Record<string, number>
  uniqueIps: Record<string, number>
  donationConversion: { started: number; completed: number; rate: number }
  errors24h: number
  topPages: { path: string; views: number }[]
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = createTranslator(locale, statsTranslations)

  // Fetch from internal API
  const baseUrl = process.env.NEXT_PUBLIC_SELF_ENDPOINT
    ? process.env.NEXT_PUBLIC_SELF_ENDPOINT.replace('/api/self-verify', '')
    : 'http://localhost:4000'
  let data: SummaryData | null = null
  let error: string | null = null

  try {
    const res = await fetch(`${baseUrl}/api/web-analytics/summary`, {
      cache: 'no-store',
    })
    if (res.ok) {
      data = await res.json()
    } else {
      error = `HTTP ${res.status}`
    }
  } catch (e) {
    error = String(e)
  }

  const periods = ['24h', '7d', '30d'] as const

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-500 mb-8">{t('description')}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
            Error loading analytics: {error}
          </div>
        )}

        {!data && !error && (
          <p className="text-gray-400 italic">{t('noData')}</p>
        )}

        {data && (
          <>
            {/* Numeric metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <MetricCard
                title={t('pageViews')}
                value={data.pageViews['24h']}
                subtitle={t('period24h')}
              />
              <MetricCard
                title={t('uniqueSessions')}
                value={data.uniqueSessions['24h']}
                subtitle={t('period24h')}
              />
              <MetricCard
                title={t('donationConversion')}
                value={`${data.donationConversion.completed}/${data.donationConversion.started}`}
                subtitle={`${t('rate')}: ${data.donationConversion.rate}%`}
              />
              <MetricCard
                title={t('uniqueWallets')}
                value={data.uniqueWallets['24h']}
                subtitle={t('period24h')}
              />
              <MetricCard
                title={t('uniqueIps')}
                value={data.uniqueIps['24h']}
                subtitle={t('period24h')}
              />
              <MetricCard
                title={t('errors24h')}
                value={data.errors24h}
                subtitle={t('period24h')}
              />
            </div>

            {/* Period comparison */}
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              {t('pageViews')}
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {periods.map((p) => (
                <div key={p} className="bg-white p-4 rounded shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.pageViews[p]}
                  </div>
                  <div className="text-sm text-gray-500">
                    {p === '24h' ? t('period24h') : p === '7d' ? t('period7d') : t('period30d')}
                  </div>
                </div>
              ))}
            </div>

            {/* Top pages */}
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              {t('topPages')}
            </h2>
            {data.topPages.length === 0 ? (
              <p className="text-gray-400 italic">{t('noData')}</p>
            ) : (
              <div className="bg-white rounded shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="p-3 font-medium text-gray-700">{t('path')}</th>
                      <th className="p-3 font-medium text-gray-700 text-right">{t('views')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((p, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 text-gray-600 font-mono text-sm">{p.path}</td>
                        <td className="p-3 text-right text-gray-800">{p.views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle?: string
}) {
  return (
    <div className="bg-white p-5 rounded shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  )
}
