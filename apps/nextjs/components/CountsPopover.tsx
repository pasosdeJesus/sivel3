'use client'

import { useState } from 'react'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@pasosdejesus/m/shadcn-components/ui/card'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'

interface CountsPopoverProps {
  counts: { casos: number; victimas: number; victimizaciones: number; actos: number }
  labelCases: string
  labelVictims: string
  labelVictimizations: string
  labelActs: string
  title: string
  totalsByFilters?: string
  variant?: 'mobile' | 'desktop'
}

export function CountsPopover({ counts, labelCases, labelVictims, labelVictimizations, labelActs, title, totalsByFilters, variant = 'mobile' }: CountsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  // The counts endpoint can fail; never assume the four keys are present.
  const c = {
    casos: Number(counts?.casos) || 0,
    victimas: Number(counts?.victimas) || 0,
    victimizaciones: Number(counts?.victimizaciones) || 0,
    actos: Number(counts?.actos) || 0,
  }

  // Versión desktop: card completa siempre visible
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">📊 {title}</CardTitle>
          {totalsByFilters && <CardDescription>{totalsByFilters}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between"><span>{labelCases}</span><Badge>{c.casos.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{labelVictims}</span><Badge>{c.victimas.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{labelVictimizations}</span><Badge>{c.victimizaciones.toLocaleString()}</Badge></div>
          <Separator />
          <div className="flex justify-between"><span>{labelActs}</span><Badge>{c.actos.toLocaleString()}</Badge></div>
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
            <span className="font-semibold text-sm">📊 {title}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500">✕</button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between"><span className="text-sm">{labelCases}</span><Badge>{c.casos.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{labelVictims}</span><Badge>{c.victimas.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{labelVictimizations}</span><Badge>{c.victimizaciones.toLocaleString()}</Badge></div>
            <div className="flex justify-between"><span className="text-sm">{labelActs}</span><Badge>{c.actos.toLocaleString()}</Badge></div>
          </div>
        </div>
      )}
    </>
  )
}