'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import {
  useInAppWallet,
  InAppWalletSetup,
  InAppWalletUnlock,
} from '@pasosdejesus/m/wallet/next'
import { getExternalProvider } from '@pasosdejesus/m/wallet'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pasosdejesus/m/shadcn-components/ui/dialog'

const localT = {
  en: {
    connect: 'Connect Wallet',
    title: 'Wallet',
    inAppBtn: 'Use in-app wallet',
    inAppHint: 'Create a wallet inside the app — no installation needed.',
    external: 'Connect external wallet',
    externalHint: 'Or connect a wallet you already have (Rabby, MetaMask…).',
    disconnect: 'Disconnect',
    connected: 'Connected wallet',
    inAppBadge: 'In-app',
    noExternal: 'No external wallet detected.',
    externalFailed: 'Could not connect the external wallet.',
    loading: 'Loading…',
  },
  es: {
    connect: 'Conectar Billetera',
    title: 'Billetera',
    inAppBtn: 'Usar billetera de la aplicación',
    inAppHint: 'Crea una billetera dentro de la aplicación, sin instalar nada.',
    external: 'Conectar billetera externa',
    externalHint: 'O conecta una billetera que ya tengas (Rabby, MetaMask…).',
    disconnect: 'Desconectar',
    connected: 'Billetera conectada',
    inAppBadge: 'En la app',
    noExternal: 'No se detectó billetera externa.',
    externalFailed: 'No se pudo conectar la billetera externa.',
    loading: 'Cargando…',
  },
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function ConnectWalletButton() {
  const { isConnected, effectiveAddress, isInApp, externalAvailable, disconnect } = useWallet()
  const inApp = useInAppWallet()
  const { t, locale } = useTranslation(localT)
  const [open, setOpen] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [error, setError] = useState('')

  const lang = locale === 'es' ? 'es' : 'en'

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setShowSetup(false)
      setError('')
    }
  }

  const handleExternal = async () => {
    setError('')
    const provider = getExternalProvider()
    if (!provider) {
      setError(t('noExternal'))
      return
    }
    try {
      await provider.request({ method: 'eth_requestAccounts' })
      setOpen(false)
    } catch {
      setError(t('externalFailed'))
    }
  }

  const renderContent = () => {
    if (showSetup) {
      return <InAppWalletSetup lang={lang} onDone={() => {}} />
    }
    if (isConnected && effectiveAddress) {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('connected')}</p>
            <p className="text-sm font-mono break-all mt-1">{effectiveAddress}</p>
            {isInApp && (
              <Badge variant="secondary" className="mt-2 text-[10px]">
                {t('inAppBadge')}
              </Badge>
            )}
          </div>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            data-testid="disconnect-wallet"
            onClick={() => disconnect()}
          >
            {t('disconnect')}
          </Button>
        </div>
      )
    }
    if (inApp.status === 'locked') {
      return <InAppWalletUnlock lang={lang} onUnlocked={() => setOpen(false)} />
    }
    if (inApp.status === 'no-wallet') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('inAppHint')}</p>
          <Button
            className="w-full"
            data-testid="use-in-app-wallet"
            onClick={() => setShowSetup(true)}
          >
            {t('inAppBtn')}
          </Button>
          {externalAvailable && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">{t('externalHint')}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="use-external-wallet"
                onClick={handleExternal}
              >
                {t('external')}
              </Button>
            </>
          )}
        </div>
      )
    }
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isConnected && effectiveAddress ? (
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-2 px-3 bg-emerald-600 hover:bg-emerald-700"
            data-testid="connected-wallet"
          >
            <Badge variant="outline" className="h-2 w-2 p-0 bg-green-500 border-green-500" />
            <span className="text-xs font-medium">{shorten(effectiveAddress)}</span>
          </Button>
        ) : (
          <Button variant="default" size="sm" className="gap-2" data-testid="connect-wallet">
            <span className="text-lg">🔗</span>
            {t('connect')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        {renderContent()}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
