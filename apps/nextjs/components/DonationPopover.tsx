'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DonationPopoverProps {
  isConnected: boolean
  selectedRegion: string
  donationAmount: string
  regionBalance: string | null
  donationRegions: Array<{ id: number; name: string }>
  onRegionChange: (value: string) => void
  onAmountChange: (value: string) => void
  onDonate: () => void
  isTransacting: boolean
  isApproving: boolean
  labels: { cause: string; availableFunds: string; amount: string; approve: string; approving: string; donating: string }
  variant?: 'mobile' | 'desktop'
}

export function DonationPopover({ isConnected, selectedRegion, donationAmount, regionBalance, donationRegions, onRegionChange, onAmountChange, onDonate, isTransacting, isApproving, labels, variant = 'mobile' }: DonationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isConnected) return null

  // Versión desktop: card con input box y balance en misma línea
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">❤️ {labels.approve}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>{labels.cause}</Label><Select value={selectedRegion} onValueChange={onRegionChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{donationRegions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{labels.availableFunds}</span>
            <span className="text-lg font-bold text-green-600">
              {regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input 
              type="number" 
              placeholder="10.00" 
              value={donationAmount} 
              onChange={(e) => onAmountChange(e.target.value)} 
              disabled={isTransacting || isApproving}
              className="flex-1"
            />
            <Button 
              onClick={onDonate} 
              disabled={isTransacting || isApproving || !donationAmount || parseFloat(donationAmount) <= 0}
              className="whitespace-nowrap"
            >
              {isApproving ? labels.approving : isTransacting ? labels.donating : labels.approve}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Versión móvil: botón flotante con pop-up
  return (
    <>
      <Button
        size="sm"
        variant="default"
        className="rounded-full shadow-lg w-12 h-12 p-0 bg-red-500 hover:bg-red-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        ❤️
      </Button>
      {isOpen && (
        <div className="fixed bottom-36 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
          <div className="flex justify-between items-center p-3 bg-red-50 border-b">
            <span className="font-semibold text-sm">❤️ {labels.approve}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500">✕</button>
          </div>
          <div className="p-3 space-y-3">
            <div><Label className="text-xs">{labels.cause}</Label><Select value={selectedRegion} onValueChange={onRegionChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{donationRegions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">{labels.availableFunds}</Label><div className="text-sm font-semibold">{regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}</div></div>
            <div><Label className="text-xs">{labels.amount}</Label><Input type="number" placeholder="10.00" value={donationAmount} onChange={(e) => onAmountChange(e.target.value)} disabled={isTransacting || isApproving} /></div>
            <Button size="sm" className="w-full" onClick={onDonate} disabled={isTransacting || isApproving}>{isApproving ? labels.approving : isTransacting ? labels.donating : labels.approve}</Button>
          </div>
        </div>
      )}
    </>
  )
}