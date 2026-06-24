'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { Skeleton } from '@pasosdejesus/m/shadcn-components/ui/skeleton'
import { MapPin, Calendar, Clock, DollarSign } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'

const tS = {
  en: {
    title: 'My Pre-Alerts',
    noWallet: 'Connect your wallet to see your purchases.',
    noAlerts: 'You have not purchased any pre-alerts yet.',
    pendingReward: 'Pending reward',
    paid: 'Paid',
    converted: 'Converted',
    reserved: 'Reserved',
    expires: 'Expires',
    buyOnMap: 'Browse pre-alerts on the map',
  },
  es: {
    title: 'Mis Pre-Alertas',
    noWallet: 'Conecta tu billetera para ver tus compras.',
    noAlerts: 'Aún no has comprado pre-alertas.',
    pendingReward: 'Pendiente de recompensa',
    paid: 'Pagado',
    converted: 'Convertida',
    reserved: 'Reservada',
    expires: 'Expira',
    buyOnMap: 'Explora pre-alertas en el mapa',
  },
}

export default function DashboardPage() {
  const params = useParams()
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en'
  const t = (k: keyof typeof tS.en) => (tS[locale as keyof typeof tS]?.[k] || tS.en[k]) as string
  const { isConnected, effectiveAddress } = useWallet()
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveAddress) { setLoading(false); return }
    fetch(`/api/pre-alerts?wallet=${effectiveAddress}&limit=100`)
      .then(r => r.json())
      .then(d => setPurchases(d.pre_alerts?.filter((p: any) => p.buyer_wallet === effectiveAddress.toLowerCase()) || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [effectiveAddress])

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">{t('noWallet')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <a href={`/${locale}/cases/osmmap`} className="text-blue-600 text-sm hover:underline">
            {t('buyOnMap')} →
          </a>
        </div>

        {purchases.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              {t('noAlerts')}
            </CardContent>
          </Card>
        ) : (
          purchases.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.titulo || `#${p.id}`}</CardTitle>
                  <Badge variant={
                    p.status === 'paid' ? 'default' :
                    p.status === 'pending_reward' ? 'secondary' :
                    p.status === 'converted' ? 'outline' : 'secondary'
                  }>
                    {p.status === 'pending_reward' ? t('pendingReward') :
                     p.status === 'paid' ? t('paid') :
                     p.status === 'converted' ? t('converted') : t('reserved')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.fecha && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{p.fecha}</span>
                  </div>
                )}
                {p.departamento && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{p.departamento}, {p.municipio}</span>
                  </div>
                )}
                {p.conversion_deadline && p.status === 'reserved' && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span>{t('expires')}: {new Date(p.conversion_deadline).toLocaleDateString()}</span>
                  </div>
                )}
                {p.score && (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <DollarSign className="h-4 w-4" />
                    <span>{p.score} USDT</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
