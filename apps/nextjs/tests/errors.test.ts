import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('lib/errors - parseWalletError', () => {
  let parseWalletError: (err: unknown, locale?: string) => string

  beforeEach(async () => {
    const mod = await import('@/lib/errors')
    parseWalletError = mod.parseWalletError
  })

  describe('insufficient funds', () => {
    it('detecta "insufficient funds" en inglés', () => {
      const err = new Error('insufficient funds for gas * price + value')
      expect(parseWalletError(err, 'en')).toContain('Insufficient balance')
    })

    it('detecta "exceeds balance"', () => {
      const err = new Error('exceeds balance')
      expect(parseWalletError(err, 'en')).toContain('Insufficient balance')
    })

    it('responde en español', () => {
      const err = new Error('insufficient funds')
      expect(parseWalletError(err, 'es')).toContain('Saldo insuficiente')
    })
  })

  describe('user rejected', () => {
    it('detecta "user rejected"', () => {
      const err = new Error('user rejected transaction')
      expect(parseWalletError(err, 'en')).toContain('Transaction cancelled')
    })

    it('detecta código 4001', () => {
      const err: any = new Error('MetaMask Tx: Cancel')
      err.code = 4001
      expect(parseWalletError(err, 'en')).toContain('Transaction cancelled')
    })

    it('responde en español', () => {
      const err = new Error('user rejected transaction')
      expect(parseWalletError(err, 'es')).toContain('Transacción cancelada')
    })
  })

  describe('network error', () => {
    it('detecta "network" en el mensaje', () => {
      const err = new Error('network changed')
      expect(parseWalletError(err, 'en')).toContain('Network error')
    })

    it('detecta "RPC"', () => {
      const err = new Error('RPC Error: connection refused')
      expect(parseWalletError(err, 'en')).toContain('Network error')
    })

    it('responde en español', () => {
      const err = new Error('network error')
      expect(parseWalletError(err, 'es')).toContain('Error de red')
    })
  })

  describe('gas error', () => {
    it('detecta "gas" en el mensaje', () => {
      const err = new Error('gas required exceeds allowance')
      expect(parseWalletError(err, 'en')).toContain('Gas error')
    })

    it('responde en español', () => {
      const err = new Error('gas error')
      expect(parseWalletError(err, 'es')).toContain('Error de gas')
    })
  })

  describe('pre-translated messages', () => {
    it('pasa mensajes de mínimo monto', () => {
      const err = new Error('El monto mínimo de donación es 0.02')
      expect(parseWalletError(err, 'es')).toBe(err.message)
    })

    it('pasa mensajes de minimum amount en inglés', () => {
      const err = new Error('minimum amount is 0.02')
      expect(parseWalletError(err, 'en')).toBe(err.message)
    })

    it('pasa mensajes de verificación fallida', () => {
      const err = new Error('La transacción no pudo ser verificada por el servidor')
      expect(parseWalletError(err, 'es')).toBe(err.message)
    })

    it('pasa mensajes de could not be verified', () => {
      const err = new Error('The transaction could not be verified')
      expect(parseWalletError(err, 'en')).toBe(err.message)
    })

    it('pasa mensajes de asignación fallida', () => {
      const err = new Error('no se pudo asignar automáticamente')
      expect(parseWalletError(err, 'es')).toBe(err.message)
    })

    it('pasa mensajes de could not be assigned', () => {
      const err = new Error('could not be assigned automatically')
      expect(parseWalletError(err, 'en')).toBe(err.message)
    })
  })

  describe('fallback', () => {
    it('usa fallback para errores desconocidos', () => {
      const err = new Error('Something unexpected happened')
      expect(parseWalletError(err, 'en')).toContain('Something unexpected happened')
    })

    it('fallback en español', () => {
      const err = new Error('Algo inesperado ocurrió')
      expect(parseWalletError(err, 'es')).toContain('Algo inesperado ocurrió')
    })

    it('fallback cuando el mensaje es string vacío', () => {
      const err = new Error('')
      expect(parseWalletError(err, 'en')).toContain('Try again later')
    })

    it('fallback con string vacío en español', () => {
      const err = new Error('')
      expect(parseWalletError(err, 'es')).toContain('Intenta nuevamente más tarde')
    })

    it('maneja null', () => {
      expect(parseWalletError(null, 'en')).toContain('null')
    })

    it('maneja undefined', () => {
      expect(parseWalletError(undefined, 'en')).toContain('undefined')
    })

    it('maneja string directa', () => {
      expect(parseWalletError('something broke', 'en')).toContain('something broke')
    })
  })

  describe('default locale', () => {
    it('usa inglés por defecto', () => {
      const err = new Error('insufficient funds')
      expect(parseWalletError(err)).toContain('Insufficient balance')
    })
  })
})
