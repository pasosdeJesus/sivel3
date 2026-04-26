'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export type LocaleStrings = Record<string, string>
export type TranslationSet = Record<string, LocaleStrings>

/**
 * Crea un traductor puro (sin hooks) para usar en funciones y server components.
 * Hace fallback a inglés cuando falta una clave en el locale solicitado.
 */
export function createTranslator(
  locale: string,
  translations: TranslationSet
): (key: string, ...args: string[]) => string {
  const lang = locale === 'es' ? 'es' : 'en'

  return (key: string, ...args: string[]) => {
    const langDict = translations[lang] as LocaleStrings | undefined
    const enDict = translations['en'] as LocaleStrings | undefined

    let template = langDict?.[key] ?? enDict?.[key]

    if (template === undefined) return key

    // Reemplazar {{0}}, {{1}}, etc. con los argumentos
    return args.reduce(
      (acc, arg, i) => acc.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), arg),
      template
    )
  }
}

/**
 * Hook para usar traducciones en client components.
 * Extrae locale de los params de la ruta.
 * Ejemplo:
 *
 *   const localT = {
 *     en: { hello: 'Hello {{0}}' },
 *     es: { hello: 'Hola {{0}}' },
 *   }
 *   const { t, locale } = useTranslation(localT)
 *   t('hello', 'Mundo')  // → "Hola Mundo"
 */
export function useTranslation(
  translations: TranslationSet,
  paramName: string = 'locale'
) {
  const params = useParams()
  const locale = ((params?.[paramName] as string) || 'en')

  const t = useMemo(
    () => createTranslator(locale, translations),
    [locale, translations]
  )

  return { t, locale }
}
