'use client'

import { useParams } from 'next/navigation'

import { useWallet } from '@/contexts/WalletContext'
import { WalletConnect } from 'generated-wallet/next'

/**
 * Header wallet entry point.
 *
 * Since REQ/75 of `m`, the engine's `WalletConnect` already composes the whole
 * `WalletDialog` (create, import, protect, recovery + 3-word quiz, unlock with
 * gesture or password, biometrics and delete) and keeps its own choice dialog
 * (`connect-wallet` → in-app or external), so sivel3 only injects the connection
 * state of its `WalletContext`, its i18n language and the storage namespace it
 * configured in `AppProvider`.
 *
 * `onSignIn` is intentionally omitted: sivel3 has no SIWE/session.
 */
export default function ConnectWalletButton() {
  const params = useParams()
  const lang = params?.locale === 'es' ? 'es' : 'en'
  const { isConnected, effectiveAddress, isInApp, externalAvailable, disconnect } = useWallet()

  return (
    <WalletConnect
      lang={lang}
      isConnected={isConnected}
      effectiveAddress={effectiveAddress}
      isInApp={isInApp}
      externalAvailable={externalAvailable}
      onDisconnect={disconnect}
      appName="sivel.xyz"
      backup={{ storageKey: 'sivel3-wallet-backup' }}
    />
  )
}
