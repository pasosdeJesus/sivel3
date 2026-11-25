'use client'

/**
 * `WalletConnect` — vista **genérica** de conexión de billetera del motor `wallet`
 * ([REQ/50](https://gitlab.com/pasosdeJesus/m/-/work_items/50) D9; base learn.tg, punto de entrada con el **modal de
 * elección** de sivel3: un solo botón «Conectar» que ofrece *in-app* o *externa*, en
 * vez de dos botones en el header).
 *
 * **Sobrecargable** (D10): el consumidor puede (a) importar esta vista, (b) usar sus
 * componentes granularmente (`WalletDialog` desde `@pasosdejesus/m/wallet/next`), o
 * (c) reemplazar el cuerpo del diálogo con `renderBody`. El estado de conexión y los
 * textos se **inyectan** (no dependemos de un contexto de la app).
 *
 * Desde REQ/75 el flujo in-app por omisión es `WalletDialog`: el diálogo de elección
 * se cierra antes de montarlo, así nunca hay dos `Dialog` activos.
 */

import { useState, type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@pasosdejesus/m/shadcn-components/ui/dialog'
import { Button } from '@pasosdejesus/m/shadcn-components/ui/button'
import { Badge } from '@pasosdejesus/m/shadcn-components/ui/badge'
import { Separator } from '@pasosdejesus/m/shadcn-components/ui/separator'
import {
  WalletDialog,
  useInAppWallet,
  type WalletDialogClassNames,
  type WalletReactMessages,
} from '@pasosdejesus/m/wallet/next'
import { getExternalProvider, type Eip1193Provider } from '@pasosdejesus/m/wallet'

export type WalletLang = 'en' | 'es'

/** Textos de la vista (inyectables; sobreescriben los por defecto). */
export interface WalletConnectMessages {
  connect: string
  title: string
  inAppBtn: string
  inAppHint: string
  external: string
  externalHint: string
  disconnect: string
  connected: string
  inAppBadge: string
  noExternal: string
  externalFailed: string
  loading: string
  signIn: string
  signInHint: string
}

const DEFAULT_MESSAGES: Record<WalletLang, WalletConnectMessages> = {
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

/** Contexto que recibe `renderBody` para sobrecargar el cuerpo del diálogo. */
export interface WalletConnectBodyContext {
  lang: WalletLang
  close: () => void
  connectExternal: () => Promise<void>
  externalError: string | null
}

export interface WalletConnectProps {
  lang?: WalletLang
  messages?: Partial<WalletConnectMessages>
  /** Estado de conexión (lo aporta el consumidor, p. ej. su propio `WalletContext`). */
  isConnected?: boolean
  effectiveAddress?: string | null
  isInApp?: boolean
  externalAvailable?: boolean
  onDisconnect?: () => void
  /**
   * Iniciar sesión (SIWE) con la billetera in-app. Se traduce al `signIn` de
   * `WalletDialog`, que entrega el mismo proveedor con el que firmará, así que
   * requiere `rpcUrl`; sin ambos no se ofrece sesión. El diálogo se cierra cuando
   * la promesa resuelve.
   */
  onSignIn?: (provider: Eip1193Provider) => void | Promise<unknown>
  /** Opciones que se pasan a `WalletDialog` (REQ/75). */
  appName?: string
  migrationHref?: string
  rpcUrl?: string
  sessionAddress?: string
  onWalletRemoved?: () => void | Promise<void>
  backup?: { storageKey?: string; wordsToVerify?: number }
  logger?: { info(message: string, tag?: string): void; error(message: string, tag?: string): void }
  dialogMessages?: Partial<WalletReactMessages>
  dialogClassNames?: WalletDialogClassNames
  /** Reemplaza el cuerpo del diálogo (sobrecarga granular). */
  renderBody?: (ctx: WalletConnectBodyContext) => ReactNode
}

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletConnect({
  lang = 'en',
  messages,
  isConnected = false,
  effectiveAddress = null,
  isInApp = false,
  externalAvailable = false,
  onDisconnect,
  onSignIn,
  appName,
  migrationHref,
  rpcUrl,
  sessionAddress,
  onWalletRemoved,
  backup,
  logger,
  dialogMessages,
  dialogClassNames,
  renderBody,
}: WalletConnectProps) {
  const text = { ...DEFAULT_MESSAGES[lang], ...messages }
  const inApp = useInAppWallet()
  const [open, setOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setError(null)
  }

  const connectExternal = async () => {
    setError(null)
    const provider = getExternalProvider()
    if (!provider) {
      setError(text.noExternal)
      return
    }
    try {
      await provider.request({ method: 'eth_requestAccounts' })
      setOpen(false)
    } catch {
      setError(text.externalFailed)
    }
  }

  const openInApp = () => {
    setOpen(false)
    setWalletOpen(true)
  }

  const handleTrigger = () => {
    // El diálogo propio sólo hace falta para elegir/conectar/desconectar; con una
    // billetera in-app existente se abre directamente el `WalletDialog` (un solo
    // `Dialog` activo).
    if (
      renderBody
      || (isConnected && effectiveAddress)
      || inApp.status === 'no-wallet'
      || inApp.status === 'loading'
    ) {
      setOpen(true)
      return
    }
    setWalletOpen(true)
  }

  const renderContent = (): ReactNode => {
    if (renderBody) {
      return renderBody({
        lang,
        close: () => setOpen(false),
        connectExternal,
        externalError: error,
      })
    }
    if (isConnected && effectiveAddress) {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">{text.connected}</p>
            <p className="text-sm font-mono break-all mt-1">{effectiveAddress}</p>
            {isInApp && (
              <Badge variant="secondary" className="mt-2 text-[10px]">
                {text.inAppBadge}
              </Badge>
            )}
          </div>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            data-testid="disconnect-wallet"
            onClick={() => onDisconnect?.()}
          >
            {text.disconnect}
          </Button>
        </div>
      )
    }
    if (inApp.status === 'no-wallet') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{text.inAppHint}</p>
          <Button className="w-full" data-testid="use-in-app-wallet" onClick={openInApp}>
            {text.inAppBtn}
          </Button>
          {externalAvailable && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">{text.externalHint}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="use-external-wallet"
                onClick={connectExternal}
              >
                {text.external}
              </Button>
            </>
          )}
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{text.loading}</p>
        <Button className="w-full" data-testid="use-in-app-wallet" onClick={openInApp}>
          {text.inAppBtn}
        </Button>
      </div>
    )
  }

  const dialogSignIn = onSignIn && rpcUrl
    ? async (provider: Eip1193Provider): Promise<unknown> => {
        const result = await onSignIn(provider)
        setWalletOpen(false)
        return result
      }
    : undefined

  const handleWalletRemoved = async (): Promise<void> => {
    await onWalletRemoved?.()
    setWalletOpen(false)
  }

  const dialogOverrides: Partial<WalletReactMessages> = { ...dialogMessages }
  if (messages?.signIn) dialogOverrides.signIn = messages.signIn
  if (messages?.signInHint) dialogOverrides.signInHint = messages.signInHint

  return (
    <>
      {isConnected && effectiveAddress ? (
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-2 px-3"
          data-testid="connected-wallet"
          onClick={handleTrigger}
        >
          <Badge variant="outline" className="h-2 w-2 p-0 bg-primary border-primary" />
          <span className="text-xs font-medium">{shorten(effectiveAddress)}</span>
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          data-testid="connect-wallet"
          onClick={handleTrigger}
        >
          {text.connect}
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{text.title}</DialogTitle>
          </DialogHeader>
          {renderContent()}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>

      {!renderBody && (
        <WalletDialog
          open={walletOpen}
          onOpenChange={setWalletOpen}
          lang={lang}
          messages={Object.keys(dialogOverrides).length ? dialogOverrides : undefined}
          appName={appName}
          migrationHref={migrationHref}
          rpcUrl={rpcUrl}
          sessionAddress={sessionAddress}
          signIn={dialogSignIn}
          onWalletRemoved={handleWalletRemoved}
          backup={backup}
          logger={logger}
          classNames={dialogClassNames}
        />
      )}
    </>
  )
}
