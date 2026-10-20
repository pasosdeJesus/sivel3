// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mocks
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock useParams
const mockUseParams = vi.fn(() => ({ locale: 'en' }))
vi.mock('next/navigation', () => ({
  useParams: mockUseParams,
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@pasosdejesus/m/shadcn-components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock setTimeout to execute immediately
const mockSetTimeout = vi.fn((fn) => { fn(); return 0 })
vi.stubGlobal('setTimeout', mockSetTimeout)

describe('hooks/useRegionBalance', () => {
  let useRegionBalance: any

  beforeEach(async () => {
    vi.restoreAllMocks()
    mockFetch.mockReset()
    mockToast.mockReset()
    mockSetTimeout.mockReset()
    // Restore setTimeout default behavior
    mockSetTimeout.mockImplementation((fn) => { fn(); return 0 })
    // Reset useParams to default
    mockUseParams.mockReturnValue({ locale: 'en' })

    const mod = await import('@/app/[locale]/cases/osmmap/hooks/useRegionBalance')
    useRegionBalance = mod.useRegionBalance
  })

  describe('fetchBalance', () => {
    it('setea balance cuando la respuesta es positiva', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ balance: '5.50' }),
      })

      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('1')
      })

      expect(result.current.regionBalance).toBe('5.50')
      expect(result.current.balanceLoading).toBe(false)
    })

    it('no hace nada si regionId está vacío', async () => {
      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('')
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reintenta cuando balance es 0', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ balance: '0' }),
      })

      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('1', 2, 100)
      })

      // Debería haber llamado fetch 3 veces (2 retries + initial)
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.current.balanceLoading).toBe(false)
    })

    it('reintenta en caso de error de red y muestra toast al agotar', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('1', 1, 100)
      })

      // 1 initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.current.balanceLoading).toBe(false)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      )
    })

    it('no muestra toast si el reintento de red eventualmente funciona', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ balance: '3.20' }),
        })

      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('1', 1, 100)
      })

      expect(result.current.regionBalance).toBe('3.20')
      expect(mockToast).not.toHaveBeenCalled()
    })
  })

  describe('locale', () => {
    it('usa español cuando el locale es es', async () => {
      // Override the mock for this test
      mockUseParams.mockReturnValue({ locale: 'es' })

      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useRegionBalance('1'))

      await act(async () => {
        result.current.fetchBalance('1', 0, 100)
      })

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: expect.stringContaining('No se pudo consultar'),
        })
      )
    })
  })
})
