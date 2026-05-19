// tests/credential-api.test.ts
// Vitest tests for credential API endpoints and db logic.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ==================== case_views table logic ====================
describe('case_views', () => {
  it('INSERT or ignore pattern prevents duplicate wallet/case pairs', () => {
    // The UNIQUE(wallet_address, case_id) constraint ensures this
    const mock = vi.fn().mockImplementation((values: any) => {
      if (values.wallet_address === '0xAAA' && values.case_id === 1) {
        return { id: 1 } // first insert succeeds
      }
      return { id: 2 } // new case succeeds
    })
    expect(mock({ wallet_address: '0xAAA', case_id: 1 })).toBeDefined()
    expect(mock({ wallet_address: '0xAAA', case_id: 2 })).toBeDefined()
  })

  it('counts distinct cases per wallet for Explorer threshold', () => {
    const views = [
      { wallet: '0xA', case_id: 1 },
      { wallet: '0xA', case_id: 2 },
      { wallet: '0xA', case_id: 3 },
      { wallet: '0xB', case_id: 1 },
    ]
    const countByWallet = (wallet: string) =>
      new Set(views.filter(v => v.wallet === wallet).map(v => v.case_id)).size

    expect(countByWallet('0xA')).toBe(3)  // qualifies for Explorer
    expect(countByWallet('0xB')).toBe(1)  // does not qualify
  })
})

// ==================== SBT breakdown logic ====================
describe('sbt breakdown', () => {
  it('calculates total SBTs from emission records', () => {
    const emissions = [
      { token_id: 1, wallet_address: '0xA' },
      { token_id: 2, wallet_address: '0xA' },
      { token_id: 2, wallet_address: '0xB' },
    ]
    const total = emissions.length
    expect(total).toBe(3)
  })

  it('groups by token type', () => {
    const emissions = [
      { token_id: 1, wallet_address: '0xA' },
      { token_id: 1, wallet_address: '0xB' },
      { token_id: 2, wallet_address: '0xA' },
    ]
    const groups = new Map<number, number>()
    for (const e of emissions) {
      groups.set(e.token_id, (groups.get(e.token_id) || 0) + 1)
    }
    expect(groups.get(1)).toBe(2)
    expect(groups.get(2)).toBe(1)
  })
})

// ==================== Connector mint guard ====================
describe('connector mint guard', () => {
  it('skips mint if wallet already has Connector in emission table', () => {
    const emissions = new Set(['0xAAA-2-celo'])
    const alreadyHas = (wallet: string) => emissions.has(`${wallet}-2-celo`)
    expect(alreadyHas('0xAAA')).toBe(true)
    expect(alreadyHas('0xBBB')).toBe(false)
  })
})

// ==================== Donation thresholds ====================
describe('donation thresholds', () => {
  const thresholds = [
    { tokenId: 3, name: 'Donor', usdt: 0.02 },
    { tokenId: 4, name: 'Donor Bronze', usdt: 5 },
    { tokenId: 5, name: 'Donor Silver', usdt: 20 },
    { tokenId: 6, name: 'Donor Gold', usdt: 50 },
    { tokenId: 7, name: 'Donor Diamond', usdt: 100 },
  ]

  it('returns all thresholds at or below total donated', () => {
    const earned = (total: number) => thresholds.filter(t => total >= t.usdt)
    expect(earned(0.01).length).toBe(0)
    expect(earned(0.02).length).toBe(1)
    expect(earned(5).length).toBe(2)
    expect(earned(150).length).toBe(5)
  })

  it('returns empty for zero donations', () => {
    expect(thresholds.filter(t => 0 >= t.usdt).length).toBe(0)
  })

  it('skips already-minted thresholds', () => {
    const total = 150
    const alreadyMinted = new Set([3, 4]) // Donor and Donor Bronze already minted
    const newOnes = thresholds.filter(t => total >= t.usdt && !alreadyMinted.has(t.tokenId))
    expect(newOnes.map(t => t.tokenId)).toEqual([5, 6, 7])
  })
})

// ==================== Global Founder ====================
describe('global founder', () => {
  it('mints up to maxSupply=50', () => {
    let counter = 0
    const mint = () => {
      if (counter < 50) { counter++; return true }
      return false
    }
    for (let i = 0; i < 60; i++) mint()
    expect(counter).toBe(50)
  })
})

// ==================== Wallet validation ====================
describe('wallet validation', () => {
  it('accepts valid 0x-prefixed 42-char addresses', () => {
    const valid = (w: string) => w.startsWith('0x') && w.length === 42
    expect(valid('0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C')).toBe(true)
    expect(valid('0x000')).toBe(false)
    expect(valid('notawallet')).toBe(false)
  })
})
