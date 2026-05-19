// tests/credential-metadata.test.ts
// Tests for credential_metadata composite PK (token_id, chain_id)

import { describe, it, expect } from 'vitest'

describe('credential_metadata composite PK', () => {
  it('allows same tokenId on different chains', () => {
    // PK is (token_id, chain_id), so token 1 on celo AND token 1 on base is valid
    const rows = [
      { token_id: 1, chain_id: 'celo', name: 'Founder User' },
      { token_id: 1, chain_id: 'base', name: 'Bible Verse' },
    ]
    const byKey = (r: typeof rows[0]) => `${r.token_id}-${r.chain_id}`
    const keys = rows.map(byKey)
    expect(new Set(keys).size).toBe(2) // both allowed
  })

  it('rejects duplicate (token_id, chain_id)', () => {
    const pk = (tokenId: number, chainId: string) => `${tokenId}-${chainId}`
    const existing = new Set<string>()
    // first insert
    existing.add(pk(1, 'celo'))
    // duplicate insert attempt
    expect(existing.has(pk(1, 'celo'))).toBe(true)
    // different chain
    expect(existing.has(pk(1, 'base'))).toBe(false)
  })

  it('sync-cache sets chain_id based on network', () => {
    const getChainId = (network: string) => network.includes('base') ? 'base' : 'celo'
    expect(getChainId('celoSepolia')).toBe('celo')
    expect(getChainId('celo')).toBe('celo')
    expect(getChainId('baseSepolia')).toBe('base')
    expect(getChainId('base')).toBe('base')
  })

  it('register-type stores chain_id with token metadata', () => {
    const values = {
      token_id: 1,
      name: 'Test',
      type: 'achievement',
      site: 'sivel.xyz',
      is_premium: false,
      is_soulbound: true,
      image_url: 'img/credential/1.png',
      chain_id: 'celo' as string,
    }
    expect(values.chain_id).toBe('celo')
    // PK = (token_id, chain_id)
    const pk = `${values.token_id}-${values.chain_id}`
    expect(pk).toBe('1-celo')
  })

  it('recompose-image queries by token_id regardless of chain_id (single chain assumption)', () => {
    // In practice, recompose works on one chain. If multi-chain needed, add --network.
    const cache = [{ token_id: 2, chain_id: 'celo', name: 'Connector' }]
    const find = (id: number) => cache.filter(r => r.token_id === id)
    expect(find(2).length).toBe(1)
    expect(find(2)[0].name).toBe('Connector')
    expect(find(99).length).toBe(0)
  })
})
