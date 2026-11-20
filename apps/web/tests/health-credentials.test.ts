import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockReadContract = vi.fn()

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ readContract: mockReadContract })),
    http: vi.fn((url?: string) => ({ url })),
  }
})

vi.mock('viem/chains', () => ({
  celo: { id: 42220, name: 'Celo' },
  celoSepolia: { id: 11142220, name: 'Celo Sepolia' },
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}))

vi.mock('@/abis/PasosDeJesusCredentials.json', () => ({ default: [] }))

vi.mock('@/lib/credentials', () => ({ getChainId: () => 'celo' }))

vi.mock('@pasosdejesus/m/blockchain/deployments', () => ({
  getCeloCredentialsAddress: vi.fn(),
  getBaseCredentialsAddress: vi.fn(),
}))

import {
  getBaseCredentialsAddress,
  getCeloCredentialsAddress,
} from '@pasosdejesus/m/blockchain/deployments'
import { http } from 'viem'
import { GET } from '@/app/api/health/credentials/route'

const CELO_ADDRESS = '0x563a7b5e6f4806b6ab179050326070ccbd3c1f5b'
const BASE_ADDRESS = '0x9aefbd59455efe0f7732638ef791f35f110ddb0c'

describe('GET /api/health/credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_RPC_URL = 'https://rpc.example/celo'
    process.env.NEXT_PUBLIC_BASE_RPC_URL = 'https://rpc.example/base'
    process.env.NEXT_PUBLIC_BASE_NETWORK = 'base'
    vi.mocked(getCeloCredentialsAddress).mockReturnValue(null)
    vi.mocked(getBaseCredentialsAddress).mockReturnValue(null)
    mockReadContract.mockResolvedValue(1n)
  })

  it('reports both chains unreachable when no address is resolved', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.celo).toBe(false)
    expect(body.base).toBe(false)
    expect(mockReadContract).not.toHaveBeenCalled()
  })

  it('reads the Celo credentials contract with the configured RPC', async () => {
    vi.mocked(getCeloCredentialsAddress).mockReturnValue(CELO_ADDRESS)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.celo).toBe(true)
    expect(body.base).toBe(false)
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({ address: CELO_ADDRESS, functionName: 'nextTokenId' })
    )
    expect(http).toHaveBeenCalledWith('https://rpc.example/celo')
  })

  it('reports a chain as unreachable when the contract read fails', async () => {
    vi.mocked(getCeloCredentialsAddress).mockReturnValue(CELO_ADDRESS)
    mockReadContract.mockRejectedValue(new Error('call reverted'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.celo).toBe(false)
  })

  it('stays healthy when only the Base credentials contract answers', async () => {
    vi.mocked(getBaseCredentialsAddress).mockReturnValue(BASE_ADDRESS)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.celo).toBe(false)
    expect(body.base).toBe(true)
    expect(http).toHaveBeenCalledWith('https://rpc.example/base')
  })
})
