// tests/credentials.test.ts
// Vitest tests for lib/credentials.ts pure functions.
// All functions receive PublicClient/WalletClient as parameters — no env dependency.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTokenIdByCourseId,
  mintCourseSBT,
  mintRoleSBT,
  mintNFT,
  hasCredentialOnChain,
  revokeCredential,
} from '@/lib/credentials'

const ADDRESS = '0x593f4486Fc7F3403e01a9c71E90ceE5DaD84A439' as `0x${string}`
const USER = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C' as `0x${string}`

function mockPublicClient(overrides: Record<string, any> = {}) {
  return {
    readContract: vi.fn(),
    ...overrides,
  } as any
}

function mockWalletClient(overrides: Record<string, any> = {}) {
  return {
    writeContract: vi.fn().mockResolvedValue('0xtxhash'),
    chain: { id: 11142220 },
    account: { address: '0xadmin' },
    ...overrides,
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ==================== getTokenIdByCourseId ====================
describe('getTokenIdByCourseId', () => {
  it('returns tokenId for registered course', async () => {
    const pc = mockPublicClient({ readContract: vi.fn().mockResolvedValue(1n) })
    const result = await getTokenIdByCourseId(pc, ADDRESS, 1)
    expect(result).toBe(1)
    expect(pc.readContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'courseIdToTokenId',
      args: [1n],
    })
  })

  it('returns 0 for unregistered course', async () => {
    const pc = mockPublicClient({ readContract: vi.fn().mockResolvedValue(0n) })
    const result = await getTokenIdByCourseId(pc, ADDRESS, 999)
    expect(result).toBe(0)
  })
})

// ==================== mintCourseSBT ====================
describe('mintCourseSBT', () => {
  it('calls mintCourseCompletion with correct args', async () => {
    const wc = mockWalletClient()
    const hash = await mintCourseSBT(wc, ADDRESS, USER, 1, 'Basic Course', false)
    expect(hash).toBe('0xtxhash')
    expect(wc.writeContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'mintCourseCompletion',
      args: [USER, 1n, 'Basic Course', false],
      chain: wc.chain,
      account: wc.account,
    })
  })

  it('passes premium=true for premium courses', async () => {
    const wc = mockWalletClient()
    await mintCourseSBT(wc, ADDRESS, USER, 2, 'Premium Course', true)
    expect(wc.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [USER, 2n, 'Premium Course', true],
      })
    )
  })
})

// ==================== mintRoleSBT ====================
describe('mintRoleSBT', () => {
  it('calls mintCredential with amount=1', async () => {
    const wc = mockWalletClient()
    const hash = await mintRoleSBT(wc, ADDRESS, USER, 3)
    expect(hash).toBe('0xtxhash')
    expect(wc.writeContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'mintCredential',
      args: [USER, 3n, 1n],
      chain: wc.chain,
      account: wc.account,
    })
  })
})

// ==================== mintNFT ====================
describe('mintNFT', () => {
  it('calls mintCredential on Base contract', async () => {
    const wc = mockWalletClient({ chain: { id: 84532 } })
    const hash = await mintNFT(wc, ADDRESS, USER, 1)
    expect(hash).toBe('0xtxhash')
    expect(wc.writeContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'mintCredential',
      args: [USER, 1n, 1n],
      chain: { id: 84532 },
      account: wc.account,
    })
  })
})

// ==================== hasCredentialOnChain ====================
describe('hasCredentialOnChain', () => {
  it('returns true when credential exists', async () => {
    const pc = mockPublicClient({ readContract: vi.fn().mockResolvedValue(true) })
    const result = await hasCredentialOnChain(pc, ADDRESS, USER, 1)
    expect(result).toBe(true)
    expect(pc.readContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'hasCredential',
      args: [USER, 1n],
    })
  })

  it('returns false when credential does not exist', async () => {
    const pc = mockPublicClient({ readContract: vi.fn().mockResolvedValue(false) })
    const result = await hasCredentialOnChain(pc, ADDRESS, USER, 99)
    expect(result).toBe(false)
  })

  it('returns false on contract read error', async () => {
    const pc = mockPublicClient({ readContract: vi.fn().mockRejectedValue(new Error('RPC down')) })
    const result = await hasCredentialOnChain(pc, ADDRESS, USER, 1)
    expect(result).toBe(false)
  })
})

// ==================== revokeCredential ====================
describe('revokeCredential', () => {
  it('calls revokeCredential with correct args', async () => {
    const wc = mockWalletClient()
    const hash = await revokeCredential(wc, ADDRESS, USER, 3, 1)
    expect(hash).toBe('0xtxhash')
    expect(wc.writeContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: expect.anything(),
      functionName: 'revokeCredential',
      args: [USER, 3n, 1n],
      chain: wc.chain,
      account: wc.account,
    })
  })

  it('accepts amount > 1 for batch revoke', async () => {
    const wc = mockWalletClient()
    await revokeCredential(wc, ADDRESS, USER, 4, 5)
    expect(wc.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ args: [USER, 4n, 5n] })
    )
  })
})
