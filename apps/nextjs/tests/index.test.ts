import { describe, it, expect } from 'vitest'
import { getVersion } from '@pasosdejesus/m'

describe('getVersion', () => {
  it('should return the correct version from package.json', () => {
    // El package.json del proyecto m, no del test-proyecto
    const expectedVersion = '0.3.1'
    expect(getVersion()).toBe(expectedVersion)
  })
})
