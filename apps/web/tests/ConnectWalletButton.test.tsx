// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Since REQ/75 of `m` the whole dialog lives in the engine's `WalletConnect`, so
// this test covers only sivel3's composition: the language it takes from the
// route, the connection state it injects, the storage namespace of its backup
// and the absence of `onSignIn` (sivel3 has no SIWE/session).
vi.mock('generated-wallet/next', async () => {
  const React = await import('react')
  const element = React.createElement
  return {
    WalletConnect: (props: Record<string, unknown>) => {
      ;(globalThis as unknown as Record<string, unknown>).__walletConnectProps = props
      return element('div', {
        'data-testid': 'wallet-connect',
        'data-lang': props.lang,
        'data-connected': String(props.isConnected),
        'data-address': String(props.effectiveAddress ?? ''),
        'data-in-app': String(props.isInApp),
        'data-external': String(props.externalAvailable),
        'data-app-name': String(props.appName ?? ''),
        'data-backup-key': String((props.backup as { storageKey?: string } | undefined)?.storageKey ?? ''),
        'data-sign-in': String(Boolean(props.onSignIn)),
        'data-has-render-body': String(Boolean(props.renderBody)),
      })
    },
  }
})

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => (globalThis as unknown as Record<string, any>).__walletState,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: (globalThis as unknown as Record<string, any>).__locale }),
}))

const estado = () => (globalThis as unknown as Record<string, any>).__walletState

describe('ConnectWalletButton', () => {
  beforeEach(() => {
    ;(globalThis as unknown as Record<string, any>).__locale = 'es'
    ;(globalThis as unknown as Record<string, any>).__walletState = {
      isConnected: false,
      effectiveAddress: null,
      isInApp: false,
      externalAvailable: false,
      disconnect: vi.fn(),
    }
  })

  it('delega el diálogo al motor con el idioma de la ruta y sin sesión', async () => {
    const { default: ConnectWalletButton } = await import('@/components/ConnectWalletButton')
    render(<ConnectWalletButton />)

    const host = screen.getByTestId('wallet-connect')
    expect(host).toHaveAttribute('data-lang', 'es')
    expect(host).toHaveAttribute('data-app-name', 'sivel.xyz')
    expect(host).toHaveAttribute('data-backup-key', 'sivel3-wallet-backup')
    expect(host).toHaveAttribute('data-sign-in', 'false')
    expect(host).toHaveAttribute('data-has-render-body', 'false')
  })

  it('traduce el locale desconocido a inglés y pasa el estado de conexión', async () => {
    ;(globalThis as unknown as Record<string, any>).__locale = 'fr'
    estado().isConnected = true
    estado().effectiveAddress = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'
    estado().isInApp = true

    const { default: ConnectWalletButton } = await import('@/components/ConnectWalletButton')
    render(<ConnectWalletButton />)

    const host = screen.getByTestId('wallet-connect')
    expect(host).toHaveAttribute('data-lang', 'en')
    expect(host).toHaveAttribute('data-connected', 'true')
    expect(host).toHaveAttribute('data-address', '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C')
    expect(host).toHaveAttribute('data-in-app', 'true')
    expect(host).toHaveAttribute('data-external', 'false')
    const props = (globalThis as unknown as Record<string, any>).__walletConnectProps
    expect(props.onDisconnect).toBe(estado().disconnect)
  })
})
