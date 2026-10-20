import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('lib/debug - safeStringify', () => {
  let safeStringify: (obj: any, maxLength?: number) => string

  beforeEach(async () => {
    const mod = await import('@/lib/debug')
    safeStringify = mod.safeStringify
  })

  it('serializa null', () => {
    expect(safeStringify(null)).toBe('null')
  })

  it('serializa undefined', () => {
    expect(safeStringify(undefined)).toBe('undefined')
  })

  it('serializa string', () => {
    expect(safeStringify('hola')).toBe('hola')
  })

  it('serializa número', () => {
    expect(safeStringify(42)).toBe('42')
  })

  it('serializa booleano', () => {
    expect(safeStringify(true)).toBe('true')
  })

  it('serializa función', () => {
    expect(safeStringify(() => 1)).toBe('[Function]')
  })

  it('serializa Error con stack', () => {
    const err = new Error('test error')
    const result = safeStringify(err)
    expect(result).toContain('Error: test error')
    expect(result).toContain('debug.test.ts') // stack trace
  })

  it('serializa objeto plano', () => {
    expect(safeStringify({ a: 1, b: '2' })).toContain('"a"')
  })

  it('maneja objetos circulares', () => {
    const obj: any = { name: 'circular' }
    obj.self = obj
    const result = safeStringify(obj)
    expect(result).toContain('[Circular]')
  })

  it('trunca strings largos', () => {
    const long = { data: 'x'.repeat(1000) }
    const result = safeStringify(long, 50)
    expect(result).toContain('[truncated]')
    expect(result.length).toBeLessThan(100)
  })
})
