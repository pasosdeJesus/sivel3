import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock window with all properties needed by logger and donate
const mockRequest = vi.fn()
const mockSend = vi.fn()

vi.stubGlobal('window', {
  location: { search: '', href: 'http://localhost' },
  ethereum: {
    isMiniPay: false,
    request: mockRequest,
    send: mockSend,
  },
})

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock setTimeout to avoid real delays in retry tests
vi.stubGlobal('setTimeout', vi.fn((fn) => fn()))

const VALID_HASH = '0x04fb9e12a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8'
const USER_ADDRESS = '0x383b1cc3ddb5d02c8c3b0dc8ea7e5f3a2b1c0d9e'
const USDT_ADDRESS = '0x4806b6ab179050326070ccbd3c1f5b0c7a1b5e6f'
const REGIONAL_DONATION_ADDRESS = '0x563a7b5e6f4806b6ab179050326070ccbd3c1f5b'

describe('lib/donate', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_USDT_ADDRESS = USDT_ADDRESS
    process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS = REGIONAL_DONATION_ADDRESS
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockRequest.mockReset()
    mockSend.mockReset()
    mockFetch.mockReset()
  })

  // ---- Minimum amount validation ----
  describe('amount validation', () => {
    it('rechaza montos menores a 0.02 USDT', async () => {
      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '0.01',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/0\.02/)
    })

    it('rechaza montos negativos', async () => {
      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '-5',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/0\.02/)
    })

    it('rechaza NaN (parseUnits lanza error)', async () => {
      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: 'abc',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/not a valid decimal/)
    })
  })

  // ---- MetaMask flow ----
  describe('MetaMask flow (ethereum.request)', () => {
    it('envia transaccion y asigna donacion exitosamente', async () => {
      // Configurar mock para MetaMask
      vi.stubGlobal('window', {
        location: { search: '', href: 'http://localhost' },
        ethereum: { isMiniPay: false, request: mockRequest, send: mockSend },
      })
      mockRequest.mockResolvedValue(VALID_HASH)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ txHash: VALID_HASH, slearn: { success: true, slearnMinted: '220.00' } }),
      })

      const { donate } = await import('@/lib/donate')
      const result = await donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'eth_sendTransaction',
        params: [expect.objectContaining({ from: USER_ADDRESS, to: USDT_ADDRESS })],
      })
      expect(mockFetch).toHaveBeenCalledWith('/api/donations/assign', expect.any(Object))
      expect(result.txHash).toBe(VALID_HASH)
      expect(result.slearn?.success).toBe(true)
    })
  })

  // ---- MiniPay flow ----
  describe('MiniPay flow (ethereum.send)', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        location: { search: '', href: 'http://localhost' },
        ethereum: { isMiniPay: true, request: mockRequest, send: mockSend },
      })
    })

    it('usa ethereum.send para MiniPay', async () => {
      mockSend.mockResolvedValue(VALID_HASH)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ txHash: VALID_HASH }),
      })

      const { donate } = await import('@/lib/donate')
      const result = await donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')

      expect(mockSend).toHaveBeenCalledWith({
        method: 'eth_sendTransaction',
        params: [expect.objectContaining({ from: USER_ADDRESS, to: USDT_ADDRESS })],
      })
      expect(result.txHash).toBe(VALID_HASH)
    })

    it('extrae el hash de respuesta object (result)', async () => {
      mockSend.mockResolvedValue({ result: VALID_HASH })
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ txHash: VALID_HASH }) })

      const { donate } = await import('@/lib/donate')
      const result = await donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')

      expect(result.txHash).toBe(VALID_HASH)
    })

    it('extrae el hash de respuesta object (hash)', async () => {
      mockSend.mockResolvedValue({ hash: VALID_HASH })
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ txHash: VALID_HASH }) })

      const { donate } = await import('@/lib/donate')
      const result = await donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')

      expect(result.txHash).toBe(VALID_HASH)
    })

    it('lanza error si MiniPay devuelve formato inesperado', async () => {
      mockSend.mockResolvedValue({ unexpected: 'formato' })

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/inesperado/i)
    })
  })

  // ---- Backend errors ----
  describe('backend errors', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        location: { search: '', href: 'http://localhost' },
        ethereum: { isMiniPay: false, request: mockRequest, send: mockSend },
      })
      mockRequest.mockResolvedValue(VALID_HASH)
    })

    it('reintenta hasta 5 veces en 5xx y muestra mensaje con hash', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      })

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/received your donation/i)
      // 1 analytics call + 5 retries = 6 total
      expect(mockFetch).toHaveBeenCalledTimes(6)
    })

    it('reintenta en 4xx (transaccion aun no confirmada)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Transaction not found'),
      })

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/HTTP 400/i)

      // 1 analytics call + 5 retries = 6 total
      expect(mockFetch).toHaveBeenCalledTimes(6)
    })

    it('maneja error de red con reintentos', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 503 }))

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/received your donation/i)

      // 1 analytics call + 5 retries = 6 total
      expect(mockFetch).toHaveBeenCalledTimes(6)
    })
  })

  // ---- Wallet detection errors ----
  describe('wallet errors', () => {
    it('lanza error cuando window no existe', async () => {
      vi.stubGlobal('window', undefined)

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/wallet/i)
    })

    it('lanza error cuando ethereum no tiene request ni send', async () => {
      vi.stubGlobal('window', {
        location: { search: '', href: 'http://localhost' },
        ethereum: { isMiniPay: false },
      })

      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '1',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'en')).rejects.toThrow(/compatible/i)
    })
  })

  // ---- Locale support ----
  describe('locale support', () => {
    it('usa español en mensaje de error cuando locale es es', async () => {
      const { donate } = await import('@/lib/donate')
      await expect(donate({
        regionId: 1,
        amount: '0.01',
        effectiveAddress: USER_ADDRESS,
        usdtContractAddress: USDT_ADDRESS,
        regionalDonationContractAddress: REGIONAL_DONATION_ADDRESS,
      }, 'es')).rejects.toThrow(/monto m.nimo/)
    })
  })
})
