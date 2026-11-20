import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Regression: the composed SBT badges are versioned under
// public/img/credential/<tokenId>.png. A fresh deploy without them renders
// broken images on /stats, on wallet profiles, and in the ERC-1155 metadata.
const ids = [1, 2, 3, 4, 5, 6, 7, 8]
const dir = path.join(process.cwd(), 'public/img/credential')
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('credential badge images', () => {
  for (const id of ids) {
    it(`serves token ${id} badge as a PNG`, () => {
      const file = path.join(dir, `${id}.png`)
      expect(fs.existsSync(file)).toBe(true)
      const buf = fs.readFileSync(file)
      expect(buf.length).toBeGreaterThan(1000)
      expect(buf.subarray(0, 8)).toEqual(PNG_SIGNATURE)
    })
  }
})
