'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FiltersPopoverProps {
  filters: {
    'filtro[fechaini]': string
    'filtro[fechafin]': string
    'filtro[departamento_id]': string
    'filtro[presponsable_id]': string
    'filtro[categoria_id]': string
  }
  departments: Array<{ id: string; nombre: string }>
  allegedPerpetrators: Array<{ id: string; nombre: string }>
  categories: Array<{ id: string; nombre: string }>
  onFilterChange: (key: string, value: string) => void
  onApplyFilters: () => void
  labels: { from: string; to: string; department: string; allegedPerpetrator: string; violence: string; filter: string; showAll: string }
  variant?: 'mobile' | 'desktop'
}

export function FiltersPopover({ filters, departments, allegedPerpetrators, categories, onFilterChange, onApplyFilters, labels, variant = 'mobile' }: FiltersPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Versión desktop: card completa siempre visible
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">🔍 {labels.filter}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{labels.from}</Label><Input type="date" value={filters['filtro[fechaini]']} onChange={(e) => onFilterChange('filtro[fechaini]', e.target.value)} /></div>
            <div><Label>{labels.to}</Label><Input type="date" value={filters['filtro[fechafin]']} onChange={(e) => onFilterChange('filtro[fechafin]', e.target.value)} /></div>
          </div>
          <div><Label>{labels.department}</Label><Select value={filters['filtro[departamento_id]']} onValueChange={(v) => onFilterChange('filtro[departamento_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{labels.allegedPerpetrator}</Label><Select value={filters['filtro[presponsable_id]']} onValueChange={(v) => onFilterChange('filtro[presponsable_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{allegedPerpetrators.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{labels.violence}</Label><Select value={filters['filtro[categoria_id]']} onValueChange={(v) => onFilterChange('filtro[categoria_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent></Select></div>
          <Button onClick={onApplyFilters} className="w-full">{labels.filter}</Button>
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
        🔍
      </Button>
      {isOpen && (
        <div className="fixed bottom-36 right-4 z-50 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-xl border">
          <div className="sticky top-0 flex justify-between items-center p-3 bg-gray-100 border-b">
            <span className="font-semibold text-sm">🔍 {labels.filter}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500">✕</button>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{labels.from}</Label><Input className="h-8" type="date" value={filters['filtro[fechaini]']} onChange={(e) => onFilterChange('filtro[fechaini]', e.target.value)} /></div>
              <div><Label className="text-xs">{labels.to}</Label><Input className="h-8" type="date" value={filters['filtro[fechafin]']} onChange={(e) => onFilterChange('filtro[fechafin]', e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">{labels.department}</Label><Select value={filters['filtro[departamento_id]']} onValueChange={(v) => onFilterChange('filtro[departamento_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">{labels.allegedPerpetrator}</Label><Select value={filters['filtro[presponsable_id]']} onValueChange={(v) => onFilterChange('filtro[presponsable_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{allegedPerpetrators.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">{labels.violence}</Label><Select value={filters['filtro[categoria_id]']} onValueChange={(v) => onFilterChange('filtro[categoria_id]', v)}><SelectTrigger><SelectValue placeholder={labels.showAll} /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent></Select></div>
            <Button size="sm" className="w-full" onClick={onApplyFilters}>{labels.filter}</Button>
          </div>
        </div>
      )}
    </>
  )
}