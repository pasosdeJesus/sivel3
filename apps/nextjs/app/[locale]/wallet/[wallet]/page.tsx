'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createTranslator } from '@pasosdejesus/m/i18n'

const t = {
  en: {
    title: 'Wallet Profile',
    notFound: 'Wallet not found or has no activity.',
    activity: 'Activity',
    sbtsEarned: 'SBTs Earned',
    donated: 'Total Donated',
    donations: 'Donations',
    firstActivity: 'First Activity',
    viewOnExplorer: 'View on CeloScan',
    share: 'Share',
    copied: 'Copied!',
    loading: 'Loading...',
  },
  es: {
    title: 'Perfil de Billetera',
    notFound: 'Billetera no encontrada o sin actividad.',
    activity: 'Actividad',
    sbtsEarned: 'SBTs Obtenidos',
    donated: 'Donado Total',
    donations: 'Donaciones',
    firstActivity: 'Primera Actividad',
    viewOnExplorer: 'Ver en CeloScan',
    share: 'Compartir',
    copied: '¡Copiado!',
    loading: 'Cargando...',
  },
}

interface SbtInfo {
  tokenId: number
  name: string
  imageUrl: string
  earnedAt: string
}

interface WalletData {
  sbts: SbtInfo[]
  totalDonated: string
  donationCount: number
  firstActivity: string | null
}

export default function WalletPage() {
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const wallet = (params.wallet as string) || ''
  const tt = createTranslator(locale, t)

  const [data, setData] = useState<WalletData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!wallet || wallet.length !== 42 || !wallet.startsWith('0x')) {
      setError('Invalid wallet address')
      return
    }
    fetch(`/api/credential/wallet/${wallet}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('not_found'))
  }, [wallet])

  const share = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error === 'Invalid wallet address') {
    return <div className="min-h-screen bg-gray-50 py-10"><div className="container mx-auto px-4 max-w-2xl"><h1 className="text-3xl font-bold text-gray-900 mb-2">{tt('title')}</h1><p className="text-red-500">{error}</p></div></div>
  }

  if (error) {
    return <div className="min-h-screen bg-gray-50 py-10"><div className="container mx-auto px-4 max-w-2xl"><h1 className="text-3xl font-bold text-gray-900 mb-2">{tt('title')}</h1><p className="text-gray-500 italic">{tt('notFound')}</p></div></div>
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 py-10"><div className="container mx-auto px-4 max-w-2xl"><h1 className="text-3xl font-bold text-gray-900 mb-2">{tt('title')}</h1><p className="text-gray-400 italic">{tt('loading')}</p></div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{tt('title')}</h1>
          <button
            onClick={share}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            {copied ? tt('copied') : tt('share')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="font-mono text-sm text-gray-600 mb-2 break-all">{wallet}</div>
          <a
            href={`https://celo-sepolia.blockscout.com/address/${wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm hover:underline"
          >
            {tt('viewOnExplorer')} ↗
          </a>
        </div>

        {data.firstActivity && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="text-sm text-gray-500">{tt('firstActivity')}</div>
            <div className="text-lg font-semibold">{new Date(data.firstActivity).toLocaleDateString()}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">{tt('donated')}</div>
            <div className="text-xl font-bold">{parseFloat(data.totalDonated).toFixed(2)} USDT</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">{tt('donations')}</div>
            <div className="text-xl font-bold">{data.donationCount}</div>
          </div>
        </div>

        {data.sbts.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{tt('sbtsEarned')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.sbts.map((sbt) => (
                <div key={sbt.tokenId} className="text-center p-3 bg-gray-50 rounded-lg">
                  <img src={'/' + sbt.imageUrl} alt={sbt.name} className="w-20 h-20 mx-auto mb-2 rounded-lg" />
                  <div className="font-medium text-sm">{sbt.name}</div>
                  <div className="text-xs text-gray-500">{new Date(sbt.earnedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
