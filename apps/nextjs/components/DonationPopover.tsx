'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { logger } from '@/lib/logger'

const localTranslations = {
  en: {
    cause: 'To document cases in',
    availableFunds: '💰 Regional Balance',
    amount: 'Amount (in USDT)',
    approve: 'Donate',
    donateTitle: 'Donate',
    approving: 'Approving...',
    donating: 'Donating...',
  },
  es: {
    cause: 'Para documentar casos en',
    availableFunds: '💰 Balance Regional',
    amount: 'Valor (en USDT)',
    approve: 'Donar',
    donateTitle: 'Donar',
    approving: 'Aprobando...',
    donating: 'Donando...',
  }
}

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
  variant?: 'mobile' | 'desktop'
}

export function DonationPopover({ isConnected, selectedRegion, donationAmount, regionBalance, donationRegions, onRegionChange, onAmountChange, onDonate, onRefreshBalance, isTransacting, isProcessing, isApproving, variant = 'mobile' }: DonationPopoverProps) {
  // ============================================
  // TODOS LOS HOOKS AL INICIO (mismo orden siempre)
  // ============================================
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation(localTranslations)
  
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
  // RENDERIZADO
  // ============================================
  if (!isConnected) return null

  // Versión desktop
  if (variant === 'desktop') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">❤️ {t('donateTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-sm font-medium text-gray-600">{t('cause')}</div>
            <div className="text-sm font-medium text-gray-600">{t('availableFunds')}</div>
            <div className="text-sm font-medium text-gray-600">{t('amount')}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Select 
              value={selectedRegion} 
              onValueChange={(value) => {
                logger.info(`Cambio de región solicitado: ${value}`, 'Donate');
                onRegionChange(value);
              }}
            >
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
                {isApproving ? t('approving') : isTransacting ? t('donating') : t('approve')}
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
            <span className="font-semibold text-sm">❤️ {t('approve')}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500">✕</button>
          </div>
          <div className="p-3 space-y-3">
            <div><Label className="text-xs">{t('cause')}</Label>
              <Select 
                value={selectedRegion} 
                onValueChange={(value) => {
                  logger.info(`Cambio de región (móvil): ${value}`, 'Donate');
                  onRegionChange(value);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{donationRegions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{t('availableFunds')}</Label><div className="text-lg font-bold text-green-600">{regionBalance ? `${parseFloat(regionBalance).toFixed(2)} USDT` : '--'}</div></div>
            <div><Label className="text-xs">{t('amount')}</Label><Input 
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
              {isApproving ? t('approving') : isTransacting ? t('donating') : t('approve')}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
