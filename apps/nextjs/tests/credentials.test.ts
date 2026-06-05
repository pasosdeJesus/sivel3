// tests/credentials.test.ts
/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Kysely } from 'kysely'

const mockDb = vi.hoisted(() => ({
  selectFrom: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  executeTakeFirst: vi.fn().mockResolvedValue(null),
  insertInto: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflict: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/.config/kysely.config', () => ({ newKyselyPostgresql: vi.fn(() => mockDb) }))
vi.mock('path', async () => ({ ...await vi.importActual('path') as any, join: vi.fn(() => '/mock') }))

vi.mock('viem', async () => ({
  ...await vi.importActual('viem') as any,
  createPublicClient: vi.fn(() => ({
    getTransactionCount: vi.fn().mockResolvedValue(10),
    getGasPrice: vi.fn().mockResolvedValue(200000000000n),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
  })),
  createWalletClient: vi.fn(() => ({ writeContract: vi.fn().mockResolvedValue('0xhash'), account: { address: '0xB' }, chain: { id: 1 } })),
  http: vi.fn(() => ({})),
}))

vi.mock('viem/accounts', async () => ({
  ...await vi.importActual('viem/accounts') as any,
  privateKeyToAccount: vi.fn(() => ({ address: '0xBACKEND' })),
}))

vi.mock('viem/chains', async () => ({ ...await vi.importActual('viem/chains') as any }))

vi.mock('@pasosdejesus/m/blockchain', () => ({
  mintCredentialWithRetry: vi.fn().mockResolvedValue('0xhash'),
  hasCredentialOnChain: vi.fn().mockResolvedValue(false),
  getCeloCredentialsAddress: vi.fn(() => '0xCONTRACT'),
}))

beforeEach(() => {
  vi.stubEnv('PRIVATE_KEY', '0xMOCK')
  vi.stubEnv('NEXT_PUBLIC_RPC_URL', 'https://rpc')
  vi.stubEnv('NEXT_PUBLIC_NETWORK', 'celo')
  vi.clearAllMocks()
})

import { mintSBT, getDonorThresholds, getChainId } from '@/lib/credentials'

describe('getChainId', () => {
  it('celo', () => expect(getChainId()).toBe('celo'))
  it('celoSepolia', () => {
    vi.stubEnv('NEXT_PUBLIC_NETWORK', 'celoSepolia')
    expect(getChainId()).toBe('celoSepolia')
  })
})

describe('getDonorThresholds', () => {
  it('vacío sin metadata', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    expect(await getDonorThresholds(mockDb as unknown as Kysely<any>, 'celo')).toEqual([])
  })

  it('retorna 5 umbrales ordenados', async () => {
    const rows = [{ token_id: 2 }, { token_id: 3 }, { token_id: 4 }, { token_id: 5 }, { token_id: 6 }]
    mockDb.executeTakeFirst.mockImplementation(() => Promise.resolve(rows.shift() || null))
    const r = await getDonorThresholds(mockDb as unknown as Kysely<any>, 'celo')
    expect(r.length).toBe(5)
    expect(r[0].name).toBe('Donor')
    expect(r[4].name).toBe('Diamond Donor')
  })

  it('retorna solo los umbrales con metadata', async () => {
    let call = 0
    mockDb.executeTakeFirst.mockImplementation(() => {
      call++
      // Solo Donor (call=1) y Bronze Donor (call=2) existen; el resto null
      if (call === 1) return Promise.resolve({ token_id: 2 })
      if (call === 2) return Promise.resolve({ token_id: 3 })
      return Promise.resolve(null)
    })
    const r = await getDonorThresholds(mockDb as unknown as Kysely<any>, 'celo')
    expect(r.length).toBe(2)
    expect(r[0].name).toBe('Donor')
    expect(r[0].minUsdt).toBe(0.02)
    expect(r[1].name).toBe('Bronze Donor')
  })

  it('respeta chainId en la consulta', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    await getDonorThresholds(mockDb as unknown as Kysely<any>, 'celoSepolia')
    const calls = mockDb.where.mock.calls.filter((c: any[]) => c[0] === 'chain_id')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0][2]).toBe('celoSepolia')
  })
})

describe('mintSBT', () => {
  it('null si ya en credential_emission', async () => {
    mockDb.executeTakeFirst.mockResolvedValue({ id: 1 })
    expect(await mintSBT('0xW', 2, 'celo')).toBeNull()
  })

  it('null si ya on-chain', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    const { hasCredentialOnChain } = await import('@pasosdejesus/m/blockchain')
    vi.mocked(hasCredentialOnChain).mockResolvedValueOnce(true)
    expect(await mintSBT('0xW', 2, 'celo')).toBeNull()
  })

  it('mintea y registra', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    const { hasCredentialOnChain } = await import('@pasosdejesus/m/blockchain')
    vi.mocked(hasCredentialOnChain).mockResolvedValue(false)
    const r = await mintSBT('0xW', 2, 'celo')
    expect(r).toEqual({ txHash: '0xhash' })
    expect(mockDb.insertInto).toHaveBeenCalledWith('credential_emission')
  })

  it('lanza si el contrato no está configurado', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    const { getCeloCredentialsAddress } = await import('@pasosdejesus/m/blockchain')
    vi.mocked(getCeloCredentialsAddress).mockReturnValueOnce(null as any)
    await expect(mintSBT('0xW', 2, 'celo')).rejects.toThrow('Contract not configured')
  })

  it('lanza si el mint on-chain falla', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)
    const { hasCredentialOnChain, getCeloCredentialsAddress, mintCredentialWithRetry } = await import('@pasosdejesus/m/blockchain')
    vi.mocked(getCeloCredentialsAddress).mockReturnValueOnce('0xCONTRACT' as any)
    vi.mocked(hasCredentialOnChain).mockResolvedValueOnce(false)
    vi.mocked(mintCredentialWithRetry).mockRejectedValueOnce(new Error('gas too low'))
    await expect(mintSBT('0xW', 2, 'celo')).rejects.toThrow('gas too low')
  })

  it('usa celoSepolia cuando NEXT_PUBLIC_NETWORK es celoSepolia', async () => {
    vi.stubEnv('NEXT_PUBLIC_NETWORK', 'celoSepolia')
    mockDb.executeTakeFirst.mockResolvedValue(null)
    const { hasCredentialOnChain, getCeloCredentialsAddress } = await import('@pasosdejesus/m/blockchain')
    vi.mocked(getCeloCredentialsAddress).mockReturnValueOnce('0xCONTRACT' as any)
    vi.mocked(hasCredentialOnChain).mockResolvedValueOnce(true)
    const r = await mintSBT('0xW', 2, 'celoSepolia')
    expect(r).toBeNull()
    vi.stubEnv('NEXT_PUBLIC_NETWORK', 'celo')
  })
})
