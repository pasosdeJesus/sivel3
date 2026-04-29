'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import commonTranslations from '@/lib/i18n/common'

export type LocaleStrings = Record<string, string>
export type TranslationSet = Record<string, LocaleStrings>

/**
 * Crea un traductor puro (sin hooks) para usar en funciones y server components.
 *
 * Hace fallback a:
 *   1. El locale solicitado del objeto translations
 *   2. inglés del objeto translations
 *   3. commonTranslations[locale] (si se proporcionó common)
 *   4. commonTranslations['en'] (si se proporcionó common)
 *   5. La clave literal
 *
 * @param locale  'es' | 'en' (cualquier otro valor cae a 'en')
 * @param translations  Traducciones locales del componente/página
 * @param common  (opcional) Traducciones globales compartidas; el hook
 *                inyecta automáticamente lib/i18n/common.ts
 */
export function createTranslator(
  locale: string,
  translations: TranslationSet,
  common?: TranslationSet
): (key: string, ...args: string[]) => string {
  const lang = locale === 'es' ? 'es' : 'en'

  const resolve = (key: string): string | undefined => {
    const dicts = [
      translations[lang],
      translations['en'],
      common?.[lang],
      common?.['en'],
    ]
    for (const d of dicts) {
      const v = (d as LocaleStrings | undefined)?.[key]
      if (v !== undefined) return v
    }
    return undefined
  }

  return (key: string, ...args: string[]) => {
    let template = resolve(key)
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
 * Hace fallback automático a lib/i18n/common.ts para claves no encontradas
 * en el objeto local.
 *
 * Ejemplo:
 *
 *   const localT = {
 *     en: { hello: 'Hello {{0}}' },
 *     es: { hola: 'Hola {{0}}' },
 *   }
 *   const { t, locale } = useTranslation(localT)
 *   t('hello', 'Mundo')  // → "Hola Mundo" (o vuelca a common si no existe)
 */
export function useTranslation(
  translations: TranslationSet,
  paramName: string = 'locale'
) {
  const params = useParams()
  const locale = ((params?.[paramName] as string) || 'en')

  const t = useMemo(
    () => createTranslator(locale, translations, commonTranslations),
    [locale, translations]
  )

  return { t, locale }
}
