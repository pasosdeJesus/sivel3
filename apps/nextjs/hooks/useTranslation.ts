'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { createTranslator } from '@pasosdejesus/m/i18n'
import type { TranslationSet } from '@pasosdejesus/m/i18n'
import commonTranslations from '@/lib/i18n/common'

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
