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
    pageViews: 'Page Views',
    uniqueSessions: 'Unique Sessions',
    uniqueWallets: 'Unique Wallets',
    uniqueIps: 'Unique IPs',
    donationConversion: 'Donation Conversion (24h)',
    errors24h: 'API Errors (24h)',
    topCases: 'Top Viewed Cases (7d)',
    pageViewsTimeline: 'Daily Page Views (30d)',
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
    totalLearningPoints: 'Learning Points',
    donationsByRegion: 'Donations by Region',
    backToMap: '← Back to Case Map',
    region: 'Region',
    count: 'Count',
    amount: 'Amount',
    donations: 'Donations',
    loading: 'Loading...',
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
    topCases: 'Casos Más Vistos (7d)',
    pageViewsTimeline: 'Vistas Diarias (30d)',
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
    totalLearningPoints: 'Puntos de Aprendizaje',
    donationsByRegion: 'Donaciones por Región',
    backToMap: '← Ir al Mapa de Casos',
    region: 'Región',
    count: 'Cantidad',
    amount: 'Monto',
    donations: 'Donaciones',
    loading: 'Cargando...',
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
  const [timeline, setTimeline] = useState<TimelineDay[]>([])
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/web-analytics/summary').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('/api/web-analytics/timeline').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`/api/regions?locale=${locale}`).then(r => r.ok ? r.json() : []),
    ]).then(([s, tl, reg]: any) => {
      setSummary(s)
      setTimeline(tl.days || [])
      setRegions(reg || [])
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

  // Filter top pages to show only case paths
  const topCases = summary.topPages
    .filter(p => p.path.includes('/cases/'))
    .slice(0, 10)
    .map(p => ({ path: p.path.replace(/^\/[a-z]{2}\//, '/'), views: p.views }))

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-500 mb-8">{t('description')}</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard title={t('pageViews')} value={summary.pageViews['24h']} subtitle={t('period24h')} />
          <MetricCard title={t('uniqueSessions')} value={summary.uniqueSessions['24h']} subtitle={t('period24h')} />
          <MetricCard title={t('donationConversion')} value={`${summary.donationConversion.completed}/${summary.donationConversion.started}`} subtitle={`${t('rate')}: ${summary.donationConversion.rate}%`} />
          <MetricCard title={t('uniqueWallets')} value={summary.uniqueWallets['24h']} subtitle={t('period24h')} />
          <MetricCard title={t('uniqueIps')} value={summary.uniqueIps['24h']} subtitle={t('period24h')} />
          <MetricCard title={t('errors24h')} value={summary.errors24h} subtitle={t('period24h')} />
        </div>

        {/* Page Views Timeline Chart */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3">{t('pageViewsTimeline')}</h2>
        <div className="bg-white p-4 rounded shadow-sm mb-8" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} tickFormatter={d => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#999' }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cases */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3">{t('topCases')}</h2>
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

        {/* Donations by Region — Bar Chart */}
        {summary.onChain.donationsByRegion.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{t('donationsByRegion')}</h2>
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

          {/* Navigation back to map */}
          <div className="mt-8 text-center">
            <a
              href={`/${locale}/cases/osmmap`}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
            >
              {t('backToMap')}
            </a>
          </div>
        </>
      )}
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
