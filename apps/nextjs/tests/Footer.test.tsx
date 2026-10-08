// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Footer reads the wallet connection state from the context.
vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => ({ isConnected: false }),
}))

describe('Footer', () => {
  it('credits Pasos de Jesús and Noche y Niebla', async () => {
    const { default: Footer } = await import('@/components/Footer')
    render(<Footer lang="en" />)

    expect(screen.getByText(/Developed by/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Pasos de Jesús' }),
    ).toHaveAttribute('href', 'https://www.pasosdeJesus.org')
    expect(screen.getByText(/Noche y Niebla/)).toBeInTheDocument()
  })

  it('prompts to connect a wallet when not connected', async () => {
    const { default: Footer } = await import('@/components/Footer')
    render(<Footer lang="en" />)

    expect(screen.getByText(/Connect a web3 wallet/)).toBeInTheDocument()
  })

  it('responds to the Spanish locale', async () => {
    const { default: Footer } = await import('@/components/Footer')
    render(<Footer lang="es" />)

    expect(screen.getByText(/Desarrollado por/)).toBeInTheDocument()
  })
})
