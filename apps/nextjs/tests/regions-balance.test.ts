import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// ============================================================
// Mocks for viem
// ============================================================
const mockReadContract = vi.fn()

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
    })),
    http: vi.fn(() => ({})),
    formatUnits: (val: bigint, decimals: number) => {
      return (Number(val) / Math.pow(10, decimals)).toString()
    },
  }
})

vi.mock('viem/chains', () => ({
  celo: { id: 42220, name: 'Celo' },
  celoSepolia: { id: 44787, name: 'Celo Sepolia' },
}))

// Mock the ABI import
vi.mock('@/abis/RegionalDonation.json', () => ({
  default: [{ type: 'function', name: 'regionalBalances', stateMutability: 'view' }],
}))

let GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

describe('GET /api/regions/[id]/balance', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS = '0x563A7b5E6f4806b6ab179050326070cCbD3C1f5b'
    process.env.NEXT_PUBLIC_NETWORK = 'celoSepolia'

    const mod = await import('@/app/api/regions/[id]/balance/route')
    GET = mod.GET as unknown as (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockReadContract.mockReset()
  })

  it('returns 400 for invalid region ID (non-numeric)', async () => {
    const req = new Request('http://localhost/api/regions/abc/balance')
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid region')
  })

  it('returns balance for valid region ID', async () => {
    mockReadContract.mockResolvedValue(BigInt(2500000)) // 2.5 USDT

    const req = new Request('http://localhost/api/regions/1/balance')
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.balance).toBe('2.5')
    expect(body.timestamp).toBeDefined()
  })

  it('returns zero balance correctly', async () => {
    mockReadContract.mockResolvedValue(BigInt(0))

    const req = new Request('http://localhost/api/regions/2/balance')
    const res = await GET(req, { params: Promise.resolve({ id: '2' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.balance).toBe('0')
  })

  it('returns large balance correctly', async () => {
    mockReadContract.mockResolvedValue(BigInt('1000000000000')) // 1M USDT

    const req = new Request('http://localhost/api/regions/1/balance')
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.balance).toBe('1000000')
  })

  it('returns 500 when contract read fails', async () => {
    mockReadContract.mockRejectedValue(new Error('RPC error'))

    const req = new Request('http://localhost/api/regions/1/balance')
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Failed to fetch balance')
  })
})
