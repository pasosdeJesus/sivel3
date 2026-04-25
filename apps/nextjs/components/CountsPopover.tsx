'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/hooks/useTranslation'

const localTranslations = {
  en: {
    totalsByFilters: 'Totals according to applied filters',
  },
  es: {
    totalsByFilters: 'Totales según filtros aplicados',
  }
}

interface CountsPopoverProps {
  counts: { casos: number; victimas: number; victimizaciones: number; actos: number }
  variant?: 'mobile' | 'desktop'
}

export function CountsPopover({ counts, variant = 'mobile' }: CountsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation(localTranslations)

  // Versión desktop: card completa siempre visible
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">📊 {t('counts')}</CardTitle>
          <CardDescription>{t('totalsByFilters')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between"><span>{t('cases')}</span><Badge>{counts.casos.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{t('victims')}</span><Badge>{counts.victimas.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{t('victimizations')}</span><Badge>{counts.victimizaciones.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{t('acts')}</span><Badge>{counts.actos.toLocaleString()}</Badge></div>
        </CardContent>
      </Card>
    )
  }

  // Versión móvil: botón flotante con pop-up
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="rounded-full shadow-lg w-12 h-12 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        📊
      </Button>
      {isOpen && (
        <div className="fixed bottom-36 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
          <div className="flex justify-between items-center p-3 bg-gray-100 border-b">
            <span className="font-semibold text-sm">📊 {t('counts')}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500">✕</button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between"><span className="text-sm">{t('cases')}</span><Badge>{counts.casos.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{t('victims')}</span><Badge>{counts.victimas.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{t('victimizations')}</span><Badge>{counts.victimizaciones.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{t('acts')}</span><Badge>{counts.actos.toLocaleString()}</Badge></div>
          </div>
        </div>
      )}
    </>
  )
}