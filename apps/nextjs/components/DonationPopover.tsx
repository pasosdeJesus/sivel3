'use client'

import { useState, useEffect, useRef } from 'react'
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
  onDonate: (amount: string) => void
  onRefreshBalance?: () => void
  isTransacting: boolean
  isProcessing: boolean
  isApproving: boolean
  labels: { cause: string; availableFunds: string; amount: string; approve: string; donateTitle?: string; approving: string; donating: string }
  variant?: 'mobile' | 'desktop'
}

export function DonationPopover({ isConnected, selectedRegion, donationAmount, regionBalance, donationRegions, onRegionChange, onAmountChange, onDonate, onRefreshBalance, isTransacting, isProcessing, isApproving, labels, variant = 'mobile' }: DonationPopoverProps) {
  // ============================================
  // TODOS LOS HOOKS AL INICIO (mismo orden siempre)
  // ============================================
  const [isOpen, setIsOpen] = useState(false)
  
  // Desktop: estado local para el monto
  const [desktopLocalAmount, setDesktopLocalAmount] = useState(donationAmount)
  
  // Mobile: ref y estado para evitar re-renders
  const mobileLocalAmountRef = useRef(donationAmount)
  const [mobileLocalAmountState, setMobileLocalAmountState] = useState(donationAmount)
  
  // Efectos de sincronización (siempre se ejecutan, aunque no se usen en una rama)
  useEffect(() => {
    setDesktopLocalAmount(donationAmount)
  }, [donationAmount])
  
  useEffect(() => {
    mobileLocalAmountRef.current = donationAmount
    setMobileLocalAmountState(donationAmount)
  }, [donationAmount])

  // ============================================
  // RENDERIZADO CONDICIONAL
  // ============================================
  if (!isConnected) return null

  // Versión desktop
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">❤️ {labels.donateTitle || labels.approve}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-sm font-medium text-gray-600">{labels.cause}</div>
            <div className="text-sm font-medium text-gray-600">{labels.availableFunds}</div>
            <div className="text-sm font-medium text-gray-600">{labels.amount}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Select value={selectedRegion} onValueChange={onRegionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {donationRegions.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="text-xl font-bold text-green-600">
              {regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}
            </div>
            
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="10.00" 
                value={desktopLocalAmount} 
                onChange={(e) => setDesktopLocalAmount(e.target.value)} 
                disabled={isTransacting || isApproving}
                className="flex-1"
              />
              <Button 
                onClick={async () => {
                  const amount = parseFloat(desktopLocalAmount)
                  console.log('🔍 [DonationPopover] Desktop - Monto:', amount)
                  
                  // Validar monto mínimo (0.02 USDT)
                  if (isNaN(amount) || amount < 0.02) {
                    alert(`⚠️ El monto mínimo de donación es 0.02 USDT. Ingresaste ${amount || 0} USDT.`)
                    return
                  }
                  
                  onAmountChange(desktopLocalAmount)
                  await new Promise(resolve => setTimeout(resolve, 100))
                  await onDonate(desktopLocalAmount)
                  if (onRefreshBalance) {
                    setTimeout(() => onRefreshBalance(), 3000)
                  }
                }}
                disabled={isProcessing || isApproving || !desktopLocalAmount || parseFloat(desktopLocalAmount) < 0.02}
                className="whitespace-nowrap"
              >
                {isApproving ? labels.approving : isTransacting ? labels.donating : labels.approve}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Versión móvil
  const handleMobileAmountChange = (newValue: string) => {
    mobileLocalAmountRef.current = newValue
    setMobileLocalAmountState(newValue)
  }
  
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
            <div><Label className="text-xs">{labels.availableFunds}</Label><div className="text-lg font-bold text-green-600">{regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}</div></div>
            <div><Label className="text-xs">{labels.amount}</Label><Input 
              type="number" 
              placeholder="10.00" 
              value={mobileLocalAmountState} 
              onChange={(e) => handleMobileAmountChange(e.target.value)} 
              disabled={isTransacting || isApproving} 
            /></div>
            <Button size="sm" className="w-full" onClick={async () => {
              const amountToDonate = parseFloat(mobileLocalAmountRef.current)
              console.log('🔍 [DonationPopover] Mobile - Monto:', amountToDonate)
              
              // Validar monto mínimo (0.02 USDT)
              if (isNaN(amountToDonate) || amountToDonate < 0.02) {
                alert(`⚠️ El monto mínimo de donación es 0.02 USDT. Ingresaste ${amountToDonate || 0} USDT.`)
                return
              }
              
              onAmountChange(mobileLocalAmountRef.current)
              await new Promise(resolve => setTimeout(resolve, 100))
              await onDonate(mobileLocalAmountRef.current)
              if (onRefreshBalance) {
                setTimeout(() => onRefreshBalance(), 3000)
              }
            }} disabled={isProcessing || isApproving || !mobileLocalAmountRef.current || parseFloat(mobileLocalAmountRef.current) < 0.02}>
              {isApproving ? labels.approving : isTransacting ? labels.donating : labels.approve}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}