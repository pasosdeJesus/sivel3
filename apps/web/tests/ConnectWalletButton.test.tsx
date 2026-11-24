// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// The wallet engine and the app context are injected as plain stubs: these tests
// cover sivel3's composition (the "saved" confirmation and the lock action), not
// the engine or the store.
vi.mock('generated-wallet/next', async () => {
  const React = await import('react')
  const element = React.createElement
  const shared = () => (globalThis as unknown as Record<string, any>).__walletShared

  return {
    WalletConnect: (props: any) =>
      element(
        'div',
        { 'data-testid': 'wallet-connect' },
        props.renderBody
          ? props.renderBody({
              close: () => shared().close(),
              connectExternal: async () => {},
            })
          : null,
      ),
    InAppWalletSetup: (props: any) =>
      element(
        'button',
        { 'data-testid': 'mock-setup', onClick: () => props.onDone('0xabc') },
        'setup',
      ),
    InAppWalletUnlock: () => element('div', { 'data-testid': 'mock-unlock' }),
    useInAppWallet: () => shared().inApp,
  }
})

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => (globalThis as unknown as Record<string, any>).__walletShared.wallet,
}))

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}))

let close: ReturnType<typeof vi.fn>
let lock: ReturnType<typeof vi.fn>

beforeEach(() => {
  close = vi.fn()
  lock = vi.fn()
  ;(globalThis as unknown as Record<string, any>).__walletShared = {
    close,
    inApp: { status: 'no-wallet', lock },
    wallet: {
      isConnected: false,
      effectiveAddress: null,
      isInApp: false,
      externalAvailable: false,
      disconnect: vi.fn(),
    },
  }
})

describe('ConnectWalletButton', () => {
  it('keeps the recovery phrase visible and closes only after the saved confirmation', async () => {
    const { default: ConnectWalletButton } = await import('@/components/ConnectWalletButton')
    render(<ConnectWalletButton />)

    fireEvent.click(screen.getByTestId('use-in-app-wallet'))
    fireEvent.click(screen.getByTestId('mock-setup'))

    const finish = screen.getByTestId('finish-in-app-wallet')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(finish)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('offers locking an unlocked in-app wallet', async () => {
    const shared = (globalThis as unknown as Record<string, any>).__walletShared
    shared.inApp.status = 'unlocked'
    shared.wallet = {
      isConnected: true,
      effectiveAddress: '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C',
      isInApp: true,
      externalAvailable: false,
      disconnect: vi.fn(),
    }

    const { default: ConnectWalletButton } = await import('@/components/ConnectWalletButton')
    render(<ConnectWalletButton />)

    fireEvent.click(screen.getByTestId('lock-wallet'))
    expect(lock).toHaveBeenCalledTimes(1)
  })
})
