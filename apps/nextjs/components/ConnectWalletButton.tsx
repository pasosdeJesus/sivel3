'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useTranslation } from '@/hooks/useTranslation'
import {
  WalletConnect,
  useInAppWallet,
  InAppWalletSetup,
  InAppWalletUnlock,
} from 'generated-wallet/next'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'

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
    signIn: 'Sign in with in-app wallet',
    signInHint: 'The wallet is unlocked: sign in to use your account.',
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
    signIn: 'Ingresar con la billetera de la aplicación',
    signInHint: 'La billetera está desbloqueada: ingresa para usar tu cuenta.',
  },
}

/** Clears sivel3's local UI state when the wallet dialog unmounts (closes). */
function ResetOnClose({ onClose }: { onClose: () => void }) {
  useEffect(() => onClose, [onClose])
  return null
}

/**
 * Header wallet entry point. Delegates the dialog, the trigger and the
 * external-wallet detection to the `wallet` engine's generic `WalletConnect`
 * view (REQ/68 Fase 4), injecting sivel3's `WalletContext` state and
 * Spanish/English texts.
 *
 * `renderBody` is used (the granular override REQ/68 allows) because the engine
 * default closes the dialog on setup completion, hiding the recovery phrase;
 * sivel3 must keep it visible so the user can back up the new wallet.
 * `onSignIn` is intentionally omitted: sivel3 has no SIWE/session.
 */
export default function ConnectWalletButton() {
  const { isConnected, effectiveAddress, isInApp, externalAvailable, disconnect } = useWallet()
  const inApp = useInAppWallet()
  const { t, locale } = useTranslation(localT)
  const [showSetup, setShowSetup] = useState(false)
  const lang = locale === 'es' ? 'es' : 'en'
  const resetSetup = useCallback(() => setShowSetup(false), [])

  const renderContent = (close: () => void, connectExternal: () => Promise<void>) => {
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
      return <InAppWalletUnlock lang={lang} onUnlocked={close} />
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
                onClick={connectExternal}
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
    <WalletConnect
      lang={lang}
      messages={{
        connect: t('connect'),
        title: t('title'),
        inAppBtn: t('inAppBtn'),
        inAppHint: t('inAppHint'),
        external: t('external'),
        externalHint: t('externalHint'),
        disconnect: t('disconnect'),
        connected: t('connected'),
        inAppBadge: t('inAppBadge'),
        noExternal: t('noExternal'),
        externalFailed: t('externalFailed'),
        loading: t('loading'),
        signIn: t('signIn'),
        signInHint: t('signInHint'),
      }}
      isConnected={isConnected}
      effectiveAddress={effectiveAddress}
      isInApp={isInApp}
      externalAvailable={externalAvailable}
      onDisconnect={disconnect}
      renderBody={({ close, connectExternal }) => (
        <>
          <ResetOnClose onClose={resetSetup} />
          {renderContent(close, connectExternal)}
        </>
      )}
    />
  )
}
