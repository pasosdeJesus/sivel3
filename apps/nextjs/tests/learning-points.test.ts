import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'

// Mocks for database operations
const { mockExecuteTakeFirst, mockExecute, mockSqlExecute, setupMocks, resetMocks, setupCommonResponses } = apiDbMocks

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock setTimeout to avoid real delays in retry tests
vi.stubGlobal('setTimeout', vi.fn((fn) => fn()))

// Mock viem/accounts (privateKeyToAccount / signMessage)
const mockSignMessage = vi.fn()
vi.mock('viem/accounts', async () => {
  const actual = await vi.importActual('viem/accounts')
  return {
    ...actual,
    privateKeyToAccount: vi.fn(() => ({
      signMessage: mockSignMessage,
      address: '0xb9c0dba5c5aae5fe81b327ff895227ee7fc44d81',
    })),
  }
})

const USER_WALLET = '0x123456789abcdef'
const VALID_TXHASH = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const LEARN_API_URL = 'https://learn.tg/api/learning-points/increment'

let incrementLearningPoints: any
let getCurrentNonce: any
let updateNonce: any
let buildMessage: any

describe('lib/learningPoints', () => {
  beforeAll(async () => {
    setupMocks()
    // Set env vars before importing the module (read at module level)
    process.env.PRIVATE_KEY = '0x7ca1a247f5ea85228506abcb86cefda2c7090b5e46d0518c80c65a7f949da67e'
    process.env.LEARNTG_ADDRESS = '0x9f636e5653b649b44c9375e6e103600ae55af979'
    process.env.LEARNTG_INCREMENT_API_URL = LEARN_API_URL

    const lp = await import('@/lib/learningPoints')
    incrementLearningPoints = lp.incrementLearningPoints
    getCurrentNonce = lp.getCurrentNonce
    updateNonce = lp.updateNonce
    buildMessage = lp.buildMessage
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    resetMocks()
    setupCommonResponses()

    // Default responses
    mockExecuteTakeFirst.mockResolvedValue(null)
    mockExecute.mockResolvedValue([])
    mockFetch.mockReset()
    mockSignMessage.mockReset()

    // Default: successful signature
    mockSignMessage.mockResolvedValue('0xmocksignature')
  })

  // ---- buildMessage ----
  describe('buildMessage', () => {
    it('construye el mensaje con prefijo sivel.xyz:increment:', () => {
      const ts = 1715123456789
      const msg = buildMessage(USER_WALLET, 1, 42, ts, VALID_TXHASH)
      expect(msg).toBe(`sivel.xyz:increment:${USER_WALLET}:1:42:${ts}:${VALID_TXHASH}`)
    })

    it('incluye el txHash al final del mensaje', () => {
      const ts = Date.now()
      const msg = buildMessage(USER_WALLET, 1, 1, ts, VALID_TXHASH)
      expect(msg.endsWith(VALID_TXHASH)).toBe(true)
    })

    it('incluye amount en la posicion correcta', () => {
      const ts = Date.now()
      const msg = buildMessage(USER_WALLET, 1, 99, ts, VALID_TXHASH)
      const parts = msg.split(':')
      // sivel.xyz:increment:{wallet}:{amount}:{nonce}:{timestamp}:{txHash}
      expect(parts[2]).toBe(USER_WALLET)
      expect(parts[3]).toBe('1')
      expect(parts[4]).toBe('99')
    })
  })

  // ---- getCurrentNonce ----
  describe('getCurrentNonce', () => {
    it('retorna last_nonce cuando existe registro', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ last_nonce: 42 }),
      }
      const nonce = await getCurrentNonce(mockDb)
      expect(nonce).toBe(42)
    })

    it('retorna 0 cuando no hay registro', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(null),
      }
      const nonce = await getCurrentNonce(mockDb)
      expect(nonce).toBe(0)
    })
  })

  // ---- updateNonce ----
  describe('updateNonce', () => {
    it('actualiza last_nonce para sivel.xyz', async () => {
      const mockExecute = vi.fn().mockResolvedValue([])
      const mockDb = {
        updateTable: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      }
      await updateNonce(mockDb, 42)
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  // ---- incrementLearningPoints ----
  describe('incrementLearningPoints', () => {
    function createMockDb(nonce: number = 0) {
      const executeTakeFirst = vi.fn().mockResolvedValue({ last_nonce: nonce })
      const execute = vi.fn().mockResolvedValue([])
      const chain = vi.fn().mockReturnThis()
      return {
        selectFrom: chain,
        where: chain,
        select: chain,
        executeTakeFirst,
        updateTable: chain,
        set: chain,
        execute,
      }
    }

    function mockFetchOk(data: Record<string, unknown>) {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(data),
      })
    }

    function mockFetchError(data: Record<string, unknown>, status: number = 400) {
      mockFetch.mockResolvedValue({
        ok: false,
        status,
        json: vi.fn().mockResolvedValue(data),
      })
    }

    it('incrementa learning points exitosamente y actualiza nonce', async () => {
      const mockDb = createMockDb(5)
      mockFetchOk({ success: true, new_learningscore: 51, new_nonce: 100 })

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Learning Points incrementados')
      expect(result.nonce).toBe(6) // nextNonce = last_nonce(5) + 1

      // Verificar que se llamó a fetch con los parámetros correctos
      expect(mockFetch).toHaveBeenCalledWith(
        LEARN_API_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(USER_WALLET),
        }),
      )
    })

    it('retorna error cuando profileScore es muy bajo', async () => {
      const mockDb = createMockDb(0)
      mockFetchError({ error: 'Profile score too low', currentScore: 30 })

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Profile score too low')
      expect(result.userMessage).toContain('complete your profile')
    })

    it('retorna error cuando el saldo es insuficiente', async () => {
      const mockDb = createMockDb(0)
      mockFetchError({ error: 'Insufficient balance' })

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Campaign balance exhausted')
      expect(result.userMessage).toContain('balance exhausted')
    })

    it('reintenta con nonce correcto cuando recibe Nonce out of order', async () => {
      const mockDb = createMockDb(5)
      // Primer intento: expectedNonce=10 → actualiza nonce a 9
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: vi.fn().mockResolvedValue({ error: 'Nonce out of order', expectedNonce: 10 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ success: true, new_learningscore: 51, new_nonce: 100 }),
        })

      // El primer executeTakeFirst retorna 5, el segundo (en la recursion) retorna 9
      mockDb.executeTakeFirst
        .mockReset()
        .mockResolvedValueOnce({ last_nonce: 5 })
        .mockResolvedValueOnce({ last_nonce: 9 })

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Learning Points incrementados')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('reintenta hasta 3 veces en caso de error de red', async () => {
      const mockDb = createMockDb(0)
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Network error')
      expect(result.userMessage).toContain('Unable to update Learning Points')
      // Debió intentar 4 veces (inicial + 3 reintentos)
      expect(mockFetch.mock.calls.length).toBe(4)
    })

    it('reintenta hasta 3 veces cuando la API responde con error transitorio', async () => {
      const mockDb = createMockDb(0)
      mockFetchError({ error: 'Some transient error' }, 500)

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Some transient error')
      // Debió intentar 4 veces (inicial + 3 reintentos)
      expect(mockFetch.mock.calls.length).toBe(4)
    })

    it('reintenta en error de red y eventualmente tiene éxito', async () => {
      const mockDb = createMockDb(0)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ success: true, new_learningscore: 51, new_nonce: 100 }),
        })

      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Learning Points incrementados')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('maneja gracilmente error de firma', async () => {
      // mockSignMessage lanza error
      mockSignMessage.mockRejectedValue(new Error('Error signing'))

      const mockDb = createMockDb(0)
      const result = await incrementLearningPoints(mockDb, USER_WALLET, VALID_TXHASH, 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Error signing')
      expect(result.userMessage).toContain('Unable to update Learning Points')
    })
  })
})
