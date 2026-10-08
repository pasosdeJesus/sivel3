// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Header reads the current route and pushes the new locale.
const mockPush = vi.fn()
let mockPathname = '/en/cases/osmmap'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}))

// The translator just echoes the key, so assertions can check the chosen key.
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}))

// ConnectWalletButton needs the wagmi/RainbowKit providers; it is not the
// subject of these tests.
vi.mock('@/components/ConnectWalletButton', () => ({
  default: () => null,
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/en/cases/osmmap'
  })

  it('renders the translated page title for the current route', async () => {
    const { default: Header } = await import('@/components/Header')
    render(<Header lang="en" />)

    expect(screen.getByText('mapOfCases')).toBeInTheDocument()
  })

  it('uses the statistics title on the /stats route', async () => {
    mockPathname = '/en/stats'
    const { default: Header } = await import('@/components/Header')
    render(<Header lang="en" />)

    expect(screen.getByText('siteStatistics')).toBeInTheDocument()
  })

  it('shows the language selector with the current language', async () => {
    const { default: Header } = await import('@/components/Header')
    render(<Header lang="en" />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('en')
  })

  it('switches the locale in the URL when the language changes', async () => {
    const { default: Header } = await import('@/components/Header')
    render(<Header lang="en" />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'es' } })

    expect(mockPush).toHaveBeenCalledWith('/es/cases/osmmap')
  })
})
