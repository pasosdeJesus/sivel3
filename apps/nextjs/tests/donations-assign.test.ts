import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'

// ============================================================
// Mocks for viem
// ============================================================
const mockGetTransaction = vi.fn()
const mockGetTransactionReceipt = vi.fn()
const mockWriteAssignDonation = vi.fn()

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getTransaction: mockGetTransaction,
      getTransactionReceipt: mockGetTransactionReceipt,
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn(),
    })),
    getContract: vi.fn(() => ({
      address: '0x563a7b5e6f4806b6ab179050326070ccbd3c1f5b' as `0x${string}`,
      write: {
        assignDonation: mockWriteAssignDonation,
      },
    })),
    http: vi.fn(() => ({})),
  }
})

vi.mock('viem/chains', () => ({
  celo: { id: 42220, name: 'Celo' },
  celoSepolia: { id: 11142220, name: 'Celo Sepolia' },
}))

// Mock viem/accounts
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0xb9c0dba5c5aae5fe81b327ff895227ee7fc44d81',
    signMessage: vi.fn(),
  })),
}))

// ============================================================
// Mocks for web-analytics (server-only modules not available in tests)
// ============================================================
vi.mock('@/lib/web-analytics', () => ({
  recordEvent: vi.fn(() => Promise.resolve()),
}))

// ============================================================
// Mocks for slearn module
// ============================================================
const mockMintSlearnCashback = vi.fn()
vi.mock('@/lib/slearn', () => ({
  mintSlearnCashback: (...args: any[]) => mockMintSlearnCashback(...args),
  getCashbackPercent: vi.fn(() => 10),
}))

// ============================================================
// Kysely mocks
// ============================================================
const { setupMocks: setupDbMocks, resetMocks: resetDbMocks } = apiDbMocks

// ============================================================
// Constants
// ============================================================
const VALID_TX_HASH = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const DONOR_ADDRESS = '0x383b1cc3ddb5d02c8c3b0dc8ea7e5f3a2b1c0d9e'
const CONTRACT_ADDRESS = '0x563a7b5e6f4806b6ab179050326070ccbd3c1f5b'
const USDT_ADDRESS = '0x4806b6ab179050326070ccbd3c1f5b0c7a1b5e6f'
const ASSIGN_TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

let POST: (request: Request) => Promise<Response>

describe('POST /api/donations/assign', () => {
  beforeAll(async () => {
    setupDbMocks()

    // Set env vars
    process.env.NEXT_PUBLIC_RPC_URL = 'https://sepolia.celo.org'
    process.env.NEXT_PUBLIC_NETWORK = 'celoSepolia'
    process.env.NEXT_PUBLIC_USDT_ADDRESS = USDT_ADDRESS
    process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS = CONTRACT_ADDRESS
    process.env.PRIVATE_KEY = '0x7ca1a247f5ea85228506abcb86cefda2c7090b5e46d0518c80c65a7f949da67e'
    process.env.LEARNTG_ADDRESS = '0x9f636e5653b649b44c9375e6e103600ae55af979'
    process.env.LEARNTG_INCREMENT_API_URL = 'https://learn.tg/api/learning-points/increment'

    const mod = await import('@/app/api/donations/assign/route')
    POST = mod.POST as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    resetDbMocks()
    mockGetTransaction.mockReset()
    mockGetTransactionReceipt.mockReset()
    mockWriteAssignDonation.mockReset()
    mockMintSlearnCashback.mockReset()
  })

  // ---- Parameter validation ----

  it('returns 400 when required params are missing', async () => {
    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when regionId is missing', async () => {
    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ---- Transaction verification failure ----

  it('returns 400 when transaction is not found on-chain', async () => {
    mockGetTransaction.mockRejectedValue(new Error('Transaction not found'))
    mockGetTransactionReceipt.mockRejectedValue(new Error('Transaction not found'))

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 1,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: '0xdead' + '0'.repeat(60),
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('no válida')
  })

  // ---- Successful donation assignment ----

  it('verifies tx, assigns donation, and mints SLEARN cashback on success', async () => {
    // Mock transaction data with regionId=1 embedded in input
    const regionIdHex = BigInt(1).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + regionIdHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: DONOR_ADDRESS,
      to: USDT_ADDRESS,
    })

    // Mock receipt with Transfer event
    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
            '0x000000000000000000000000' + DONOR_ADDRESS.slice(2).toLowerCase(),
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240', // 1 USDT = 1_000_000
        },
      ],
    })

    // Mock contract write
    mockWriteAssignDonation.mockResolvedValue(ASSIGN_TX_HASH)

    // Mock SLEARN cashback success
    mockMintSlearnCashback.mockResolvedValue({
      usdtToReserve: '10.00',
      slearnMinted: '220.00',
      txHash: ASSIGN_TX_HASH,
    })

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 1,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.txHash).toBe(ASSIGN_TX_HASH)
    expect(body.slearn.success).toBe(true)
    expect(body.slearn.slearnMinted).toBe('220.00')
  })

  // ---- Transfer verification: wrong donor ----

  it('returns 400 when donor mismatch in Transfer event', async () => {
    const regionIdHex = BigInt(1).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + regionIdHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: '0xDIFFERENTADDRESS1234567890123456789012345678',
    })

    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + 'DIFFERENTADDRESS1234567890123456789012345678',
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240',
        },
      ],
    })

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 1,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('no válida')
  })

  // ---- Transfer verification: wrong amount ----

  it('returns 400 when amount mismatch in Transfer event', async () => {
    const regionIdHex = BigInt(1).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + regionIdHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: DONOR_ADDRESS,
    })

    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + DONOR_ADDRESS.slice(2).toLowerCase(),
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x0000000000000000000000000000000000000000000000000000000000000064', // 100 not 1_000_000
        },
      ],
    })

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 1,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ---- Invalid region in tx data ----

  it('returns 400 when region ID in tx data is not 1 or 2', async () => {
    const invalidRegionHex = BigInt(99).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + invalidRegionHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: DONOR_ADDRESS,
    })

    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + DONOR_ADDRESS.slice(2).toLowerCase(),
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240',
        },
      ],
    })

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 99,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ---- Learning Points failure is non-blocking ----

  it('succeeds with slearn success=false when SLEARN minting fails', async () => {
    const regionIdHex = BigInt(2).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + regionIdHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: DONOR_ADDRESS,
    })

    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + DONOR_ADDRESS.slice(2).toLowerCase(),
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240',
        },
      ],
    })

    mockWriteAssignDonation.mockResolvedValue(ASSIGN_TX_HASH)

    // SLEARN cashback throws
    mockMintSlearnCashback.mockRejectedValue(new Error('SLEARN mint failed'))

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 2,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.slearn.success).toBe(false)
  })

  // ---- Contract call failure ----

  it('returns 500 when contract assignDonation reverts', async () => {
    const regionIdHex = BigInt(1).toString(16).padStart(64, '0')
    const dummyInput = '0xa9059cbb' + '00'.repeat(64) + '00'.repeat(64) + regionIdHex

    mockGetTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      input: dummyInput,
      from: DONOR_ADDRESS,
    })

    mockGetTransactionReceipt.mockResolvedValue({
      logs: [
        {
          address: USDT_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000' + DONOR_ADDRESS.slice(2).toLowerCase(),
            '0x000000000000000000000000' + CONTRACT_ADDRESS.slice(2).toLowerCase(),
          ],
          data: '0x00000000000000000000000000000000000000000000000000000000000f4240',
        },
      ],
    })

    mockWriteAssignDonation.mockRejectedValue(new Error('execution reverted'))

    const req = new Request('http://localhost/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId: 1,
        donor: DONOR_ADDRESS,
        amount: '1',
        txHash: VALID_TX_HASH,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
