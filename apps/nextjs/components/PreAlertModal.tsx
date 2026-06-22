'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@pasosdejesus/m/shadcn-components/ui/card'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import { ScrollArea } from '@pasosdejesus/m/shadcn-components/ui/scroll-area'
import { Skeleton } from '@pasosdejesus/m/shadcn-components/ui/skeleton'
import { MapPin, Calendar, Globe, AlertTriangle, DollarSign } from 'lucide-react'
import type { PreAlertDetail } from '@/hooks/usePreAlerts'

const tS = {
  en: {
    title: '🤖 Pre-Alert',
    sources: 'Sources',
    price: 'Price',
    buy: 'Buy for $1 USDT',
    buying: 'Processing…',
    noRefund: 'No refunds. Verify the sources before purchasing.',
    funded: 'Rewards depend on available funds and documenter approval.',
    expires: 'Expires',
    convert: 'Convert to Alert',
    converting: 'Converting…',
    owned: 'Owned',
    myPreAlerts: 'My Pre-Alerts',
    noAlerts: 'No pending pre-alerts',
    dashboardTitle: 'My Dashboard',
    pendingReward: 'Awaiting reward',
    paid: 'Paid',
  },
  es: {
    title: '🤖 Pre-Alerta',
    sources: 'Fuentes',
    price: 'Precio',
    buy: 'Comprar por $1 USDT',
    buying: 'Procesando…',
    noRefund: 'Sin reembolsos. Verifica las fuentes antes de comprar.',
    funded: 'Las recompensas dependen de fondos disponibles y aprobación del documentador.',
    expires: 'Expira',
    convert: 'Convertir a Alerta',
    converting: 'Convirtiendo…',
    owned: 'Adquirida',
    myPreAlerts: 'Mis Pre-Alertas',
    noAlerts: 'No hay pre-alertas pendientes',
    dashboardTitle: 'Mi Tablero',
    pendingReward: 'Pendiente de recompensa',
    paid: 'Pagado',
  },
}

interface PreAlertModalProps {
  preAlert: PreAlertDetail | null
  loading: boolean
  isConnected: boolean
  wallet: string | null
  isVerified?: boolean
  locale?: string
  onBuy: (id: number) => Promise<void>
  onConvert: (id: number) => Promise<void>
  onClose: () => void
}

export function PreAlertModal({
  preAlert,
  loading,
  isConnected,
  wallet,
  isVerified = false,
  locale = 'en',
  onBuy,
  onConvert,
  onClose,
}: PreAlertModalProps) {
  const t = (key: keyof typeof tS.en) => (tS[locale as keyof typeof tS]?.[key] || tS.en[key]) as string
  const [actionLoading, setActionLoading] = useState(false)

  if (!preAlert && !loading) return null

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-[90vh] z-30 shadow-xl flex flex-col">
      <CardHeader className="pb-3 relative flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          {t('title')} #{preAlert?.id}
        </CardTitle>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>
      </CardHeader>

      <ScrollArea className="flex-grow px-4" style={{ overflow: 'auto' }}>
        {loading || !preAlert ? (
          <div className="space-y-4 p-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            <div>
              <h3 className="font-semibold text-lg mb-2">{preAlert.titulo}</h3>
              {preAlert.json_data && (preAlert.json_data as any).hechos && (
                <p className="text-sm text-gray-700">{String((preAlert.json_data as any).hechos)}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              {preAlert.fecha && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{preAlert.fecha}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{preAlert.departamento}, {preAlert.municipio}</span>
              </div>
            </div>

            {preAlert.source_urls && preAlert.source_urls.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('sources')}
                  </h4>
                  <ul className="text-xs space-y-1">
                    {preAlert.source_urls.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                          {url.length > 60 ? url.slice(0, 60) + '…' : url}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {preAlert.source_summary && (
                    <p className="text-xs text-gray-500 mt-1">{preAlert.source_summary}</p>
                  )}
                </div>
              </>
            )}

            {preAlert.can_purchase && (
              <>
                <Separator />
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{t('noRefund')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{t('funded')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t('price')}: $1 USDT</span>
                  {isConnected && isVerified ? (
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={async () => {
                        setActionLoading(true)
                        try { await onBuy(preAlert.id) } finally { setActionLoading(false) }
                      }}
                    >
                      {actionLoading ? t('buying') : t('buy')}
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">{isConnected ? 'Verify on learn.tg to purchase' : 'Connect wallet to purchase'}</span>
                  )}
                </div>
              </>
            )}

            {preAlert.status === 'reserved' && preAlert.conversion_deadline && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-full justify-center">
                  {t('owned')}
                </Badge>
                <p className="text-xs text-gray-500 text-center">
                  {t('expires')}: {new Date(preAlert.conversion_deadline).toLocaleDateString()}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true)
                    try { await onConvert(preAlert.id) } finally { setActionLoading(false) }
                  }}
                >
                  {actionLoading ? t('converting') : t('convert')}
                </Button>
              </>
            )}

            {!preAlert.can_purchase && preAlert.status !== 'reserved' && preAlert.bought_at && (
              <Badge variant="outline" className="w-full justify-center">
                {preAlert.status === 'converted' ? t('pendingReward') : t('paid')}
              </Badge>
            )}
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}
