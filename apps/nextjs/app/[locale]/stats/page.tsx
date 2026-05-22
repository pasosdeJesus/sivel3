'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createTranslator } from '@pasosdejesus/m/i18n'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const statsTranslations = {
  en: {
    title: 'Site Statistics',
    description: 'Real-time usage analytics for sivel.xyz',
    pageViewsTimeline: 'Daily Page Views (30d)',
    uniqueWalletsTimeline: 'Daily Unique Wallets (30d)',
    uniqueIpsTimeline: 'Daily Unique IPs (30d)',
    errorsTimeline: 'Daily API Errors (30d)',
    donationsTimeline: 'Daily Donations (30d)',
    topCases: 'Top Viewed Cases (30d)',
    views: 'Views',
    started: 'Started',
    completed: 'Completed',
    rate: 'Rate',
    period24h: '24h',
    period7d: '7 days',
    period30d: '30 days',
    noData: 'No data yet. Analytics are collected as users interact with the site.',
    onChain: 'On-Chain',
    totalDonations: 'Total Donations',
    totalUsdtDonated: 'Total USDT Donated',
    uniqueDonors: 'Unique Donors',
    totalLearningPoints: 'Learning Points Given',
    donationsByRegion: 'Donations by Region',
    backToMap: '← Back to Case Map',
    region: 'Region',
    count: 'Count',
    amount: 'Amount',
    donations: 'Donations',
    loading: 'Loading...',
    sbtsTitle: 'Soulbound Tokens (SBTs)',
    totalSbts: 'Total SBTs Minted',
    sbtBreakdown: 'SBT Breakdown',
    topDonors: 'Top Donors',
    donor: 'Donor',
    sbtsEarned: 'SBTs',
    noSbts: 'No SBTs minted yet. They will appear here when users earn them.',
  },
  es: {
    title: 'Estadísticas del Sitio',
    description: 'Analíticas de uso en tiempo real para sivel.xyz',
    pageViewsTimeline: 'Vistas Diarias (30d)',
    uniqueWalletsTimeline: 'Billeteras Únicas Diarias (30d)',
    uniqueIpsTimeline: 'IPs Únicas Diarias (30d)',
    errorsTimeline: 'Errores de API Diarios (30d)',
    donationsTimeline: 'Donaciones Diarias (30d)',
    topCases: 'Casos Más Vistos (30d)',
    views: 'Vistas',
    started: 'Iniciadas',
    completed: 'Completadas',
    rate: 'Tasa',
    period24h: '24h',
    period7d: '7 días',
    period30d: '30 días',
    noData: 'Sin datos aún. Las analíticas se recopilan cuando los usuarios interactúan con el sitio.',
    onChain: 'En Cadena',
    totalDonations: 'Donaciones Totales',
    totalUsdtDonated: 'USDT Donado Total',
    uniqueDonors: 'Donantes Únicos',
    totalLearningPoints: 'Puntos de Aprendizaje Entregados',
    donationsByRegion: 'Donaciones por Región',
    backToMap: '← Ir al Mapa de Casos',
    region: 'Región',
    count: 'Cantidad',
    amount: 'Monto',
    donations: 'Donaciones',
    loading: 'Cargando...',
    sbtsTitle: 'Soulbound Tokens (SBTs)',
    totalSbts: 'Total SBTs Minteados',
    sbtBreakdown: 'Desglose de SBTs',
    topDonors: 'Mayores Donantes',
    donor: 'Donante',
    sbtsEarned: 'SBTs',
    noSbts: 'Aún no hay SBTs minteados. Aparecerán aquí cuando los usuarios los obtengan.',
  },
}

interface SummaryData {
  pageViews: Record<string, number>
  uniqueWallets: Record<string, number>
  uniqueIps: Record<string, number>
  donationConversion: { started: number; completed: number; rate: number }
  errors24h: number
  topPages: { path: string; views: number }[]
  onChain: {
    totalDonations: number
    totalUsdtDonated: string
    uniqueDonors: number
    totalLearningPoints: string
    donationsByRegion: { regionId: number; count: number; total: string }[]
  }
}

interface TimelineDay {
  date: string
  count: number
}

export default function StatsPage() {
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const t = createTranslator(locale, statsTranslations)

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [pageviewsTimeline, setPageviewsTimeline] = useState<TimelineDay[]>([])
  const [walletsTimeline, setWalletsTimeline] = useState<TimelineDay[]>([])
  const [ipsTimeline, setIpsTimeline] = useState<TimelineDay[]>([])
  const [errorsTimeline, setErrorsTimeline] = useState<TimelineDay[]>([])
  const [donationsTimeline, setDonationsTimeline] = useState<TimelineDay[]>([])
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [sbtBreakdown, setSbtBreakdown] = useState<{ tokenId: number; name: string; imageUrl: string; count: number }[]>([])
  const [leaderboard, setLeaderboard] = useState<{ wallet: string; totalDonatedUsdt: string; sbtCount: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/web-analytics/summary').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline?metric=pageviews&days=30').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline?metric=uniqueWallets&days=30').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline?metric=uniqueIps&days=30').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline?metric=errors&days=30').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline?metric=donations&days=30').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`/api/regions?locale=${locale}`).then(r => r.ok ? r.json() : []),
      fetch('/api/credential/breakdown').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/credential/leaderboard?limit=10').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, pv, wl, ip, er, dn, reg, breakdown, lb]: any) => {
      setSummary(s)
      setPageviewsTimeline(pv.data || [])
      setWalletsTimeline(wl.data || [])
      setIpsTimeline(ip.data || [])
      setErrorsTimeline(er.data || [])
      setDonationsTimeline(dn.data || [])
      setRegions(reg || [])
      setSbtBreakdown(breakdown || [])
      setLeaderboard(lb || [])
    }).catch(e => {
      setError(String(e))
    })
  }, [locale])

  const regionNames = Object.fromEntries(regions.map(r => [r.id, r.name]))

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
            Error loading analytics: {error}
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-400 italic">{t('loading')}</p>
        </div>
      </div>
    )
  }

  // Filter top pages to show only case paths, merging by normalized path
  const casePages = summary.topPages
    .filter(p => p.path.includes('/cases/'))
    .map(p => ({ path: p.path.replace(/^\/[a-z]{2}\//, '/'), views: p.views }))

  // Aggregate by path (locale-stripped paths may collide)
  const merged = new Map<string, number>()
  for (const p of casePages) {
    merged.set(p.path, (merged.get(p.path) || 0) + p.views)
  }
  const topCases = Array.from(merged.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-500 mb-8">{t('description')}</p>

        {/* Timeline Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <TimelineChart title={t('pageViewsTimeline')} data={pageviewsTimeline} color="#7c3aed" />
          <TimelineChart title={t('uniqueWalletsTimeline')} data={walletsTimeline} color="#0891b2" />
          <TimelineChart title={t('uniqueIpsTimeline')} data={ipsTimeline} color="#059669" />
          <TimelineChart title={t('errorsTimeline')} data={errorsTimeline} color="#dc2626" />
        </div>

        {/* Donations Timeline — full width */}
        <TimelineChart title={t('donationsTimeline')} data={donationsTimeline} color="#f59e0b" />

        {/* Top Cases */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-8">{t('topCases')}</h2>
        {topCases.length === 0 ? (
          <p className="text-gray-400 italic mb-8">{t('noData')}</p>
        ) : (
          <div className="bg-white p-4 rounded shadow-sm mb-8" style={{ height: Math.max(120, topCases.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCases} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
                <YAxis type="category" dataKey="path" tick={{ fontSize: 10, fill: '#666' }} width={160} />
                <Tooltip />
                <Bar dataKey="views" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* On-chain KPIs */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-8">{t('onChain')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard title={t('totalDonations')} value={summary.onChain.totalDonations} />
          <MetricCard title={t('totalUsdtDonated')} value={`${parseFloat(summary.onChain.totalUsdtDonated).toFixed(2)} USDT`} />
          <MetricCard title={t('uniqueDonors')} value={summary.onChain.uniqueDonors} />
          <MetricCard title={t('totalLearningPoints')} value={parseFloat(summary.onChain.totalLearningPoints).toFixed(2)} />
        </div>

        {/* SBTs Section */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-8">{t('sbtsTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MetricCard
            title={t('totalSbts')}
            value={sbtBreakdown.reduce((sum, s) => sum + Number(s.count), 0)}
          />
          <MetricCard title={t('sbtBreakdown')} value={sbtBreakdown.length + ' types'} />
        </div>

        {/* SBT Breakdown */}
        {sbtBreakdown.length > 0 && (
          <div className="bg-white p-4 rounded shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('sbtBreakdown')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sbtBreakdown.map((sbt) => (
                <div key={sbt.tokenId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img src={'/' + sbt.imageUrl} alt={sbt.name} className="w-12 h-12 rounded-lg" />
                  <div>
                    <div className="font-medium text-sm text-gray-800">{sbt.name}</div>
                    <div className="text-xs text-gray-500">{Number(sbt.count)} minted</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-white p-4 rounded shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('topDonors')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">{t('donor')}</th>
                    <th className="px-4 py-2">{t('sbtsEarned')}</th>
                    <th className="px-4 py-2">{t('amount')} (USDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.wallet} className="border-t">
                      <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        <a href={`/${locale}/wallet/${row.wallet}`} className="text-blue-600 hover:underline">
                          {row.wallet.slice(0, 6)}...{row.wallet.slice(-4)}
                        </a>
                      </td>
                      <td className="px-4 py-2">{Number(row.sbtCount)}</td>
                      <td className="px-4 py-2">{parseFloat(row.totalDonatedUsdt).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sbtBreakdown.length === 0 && <p className="text-gray-400 italic mb-8">{t('noSbts')}</p>}

        {/* Donations by Region — Bar Chart */}
        {summary.onChain.donationsByRegion.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-8">{t('donationsByRegion')}</h2>
            <div className="bg-white p-4 rounded shadow-sm mb-8" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.onChain.donationsByRegion.map(r => ({ region: regionNames[r.regionId] || `Region ${r.regionId}`, donations: r.count, usdt: parseFloat(r.total) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="donations" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>

        )}

        {/* Navigation back to map */}
        <div className="mt-8 text-center">
          <a
            href={`/${locale}/cases/osmmap`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
          >
            {t('backToMap')}
          </a>
        </div>
      </div>
    </div>
  )
}

function TimelineChart({ title, data, color }: { title: string; data: TimelineDay[]; color: string }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-3">{title}</h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} tickFormatter={d => d.slice(5)} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#999' }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white p-5 rounded shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  )
}
