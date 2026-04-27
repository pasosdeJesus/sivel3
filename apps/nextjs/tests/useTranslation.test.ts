import { describe, it, expect, beforeEach } from 'vitest'

describe('hooks/useTranslation - createTranslator', () => {
  let createTranslator: (locale: string, translations: any) => (key: string, ...args: string[]) => string

  beforeEach(async () => {
    const mod = await import('@/hooks/useTranslation')
    createTranslator = mod.createTranslator
  })

  const testTranslations = {
    en: {
      hello: 'Hello',
      greeting: 'Hello {{0}}',
      welcome: 'Welcome {{0}}, you have {{1}} messages',
    },
    es: {
      hello: 'Hola',
      greeting: 'Hola {{0}}',
    },
  }

  it('traduce al inglés', () => {
    const t = createTranslator('en', testTranslations)
    expect(t('hello')).toBe('Hello')
  })

  it('traduce al español', () => {
    const t = createTranslator('es', testTranslations)
    expect(t('hello')).toBe('Hola')
  })

  it('fallback a inglés cuando falta clave en español', () => {
    const t = createTranslator('es', testTranslations)
    expect(t('welcome')).toBe('Welcome {{0}}, you have {{1}} messages')
  })

  it('retorna la clave cuando no existe en ningún locale', () => {
    const t = createTranslator('en', testTranslations)
    expect(t('nonexistent')).toBe('nonexistent')
  })

  it('fallback a inglés cuando el locale no es ni en ni es', () => {
    const t = createTranslator('fr', testTranslations)
    expect(t('hello')).toBe('Hello')
  })

  it('reemplaza {{0}} con un argumento', () => {
    const t = createTranslator('en', testTranslations)
    expect(t('greeting', 'Mundo')).toBe('Hello Mundo')
  })

  it('reemplaza {{0}} con un argumento en español', () => {
    const t = createTranslator('es', testTranslations)
    expect(t('greeting', 'Mundo')).toBe('Hola Mundo')
  })

  it('reemplaza múltiples argumentos {{0}} y {{1}}', () => {
    const t = createTranslator('en', testTranslations)
    expect(t('welcome', 'John', '5')).toBe('Welcome John, you have 5 messages')
  })

  it('reemplaza la misma variable múltiples veces', () => {
    const multiTranslations = {
      en: { repeated: '{{0}} says {{0}}' },
      es: { repeated: '{{0}} dice {{0}}' },
    }
    const t = createTranslator('en', multiTranslations)
    expect(t('repeated', 'echo')).toBe('echo says echo')
  })
})
