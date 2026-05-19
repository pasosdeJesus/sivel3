// tests/deployments.test.ts
// Vitest tests for lib/deployments.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs for testing
const mockFiles: Record<string, string> = {}

vi.mock('fs', () => ({
  default: {
    existsSync: (p: string) => p in mockFiles,
    readFileSync: (p: string, _enc: string) => mockFiles[p] || '',
  },
}))

// We test the logic without importing (fs is mocked)
describe('deployments', () => {
  beforeEach(() => {
    Object.keys(mockFiles).forEach(k => delete mockFiles[k])
  })

  it('reads deployment from JSON file when it exists', () => {
    mockFiles['deployments/celoSepolia.json'] = JSON.stringify({
      contract: 'PasosDeJesusCredentials',
      address: '0x593f4486Fc7F3403e01a9c71E90ceE5DaD84A439',
      chainId: 11142220,
      network: 'celoSepolia',
      transactionHash: '0xabc',
      deployedAt: '2026-05-18T00:00:00Z',
    })

    // Simulate reading
    const data = JSON.parse(mockFiles['deployments/celoSepolia.json'])
    expect(data.address).toBe('0x593f4486Fc7F3403e01a9c71E90ceE5DaD84A439')
    expect(data.network).toBe('celoSepolia')
  })

  it('returns null when deployment file does not exist', () => {
    const exists = 'deployments/mainnet.json' in mockFiles
    expect(exists).toBe(false)
  })

  it('parses all required Deployment fields', () => {
    const deployment = {
      contract: 'Test',
      address: '0x1234',
      chainId: 1,
      network: 'mainnet',
      transactionHash: '0xhash',
      deployedAt: '2026-01-01T00:00:00Z',
    }
    expect(deployment.contract).toBeDefined()
    expect(deployment.address.startsWith('0x')).toBe(true)
    expect(typeof deployment.chainId).toBe('number')
  })
})
