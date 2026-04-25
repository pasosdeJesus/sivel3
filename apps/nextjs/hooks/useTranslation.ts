'use client';

import { useParams } from 'next/navigation';
import { commonTranslations } from '@/lib/i18n/common';

/**
 * Core translation logic separated from React hooks.
 * Can be used in Server Components or vanilla JS/TS files.
 */
export function createTranslator<T extends Record<string, any>>(
  locale: 'en' | 'es',
  localTranslations?: { en: T; es: T }
) {
  return function t(
    key: keyof T | keyof typeof commonTranslations.en,
    variables?: Record<string, string | number>
  ): string {
    // 1. Try local translations first
    let text = (localTranslations?.[locale] as any)?.[key];

    // 2. Fallback to common translations
    if (text === undefined) {
      text = (commonTranslations[locale] as any)[key];
    }

    // 3. Last resort: return the key itself
    if (text === undefined) {
      return String(key);
    }

    // 4. Handle variable replacement {{variable}}
    if (variables) {
      Object.entries(variables).forEach(([name, value]) => {
        text = text.replace(new RegExp(`{{${name}}}`, 'g'), String(value));
      });
    }

    return text;
  };
}

/**
 * A lightweight, zero-dependency translation hook for SIVeL 3 Client Components.
 * Optimized for OpenBSD/adJ.
 * 
 * @param localTranslations Optional local translations object.
 * @param overrideLocale Optional locale to use instead of the one from the URL.
 */
export function useTranslation<T extends Record<string, any>>(
  localTranslations?: { en: T; es: T },
  overrideLocale?: 'en' | 'es'
) {
  const params = useParams();
  const locale = overrideLocale || (params?.locale as 'en' | 'es') || 'en';
  
  const t = createTranslator(locale, localTranslations);

  return { t, locale };
}
