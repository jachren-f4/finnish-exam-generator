/**
 * i18n Translation Hook (Client-Side)
 * Provides translation function with fallback support
 */

import { en, fi } from './locales'
import type { Locale, TranslationParams } from './types'

const locales = { en, fi }

/**
 * Client-side translation hook
 * Reads locale from NEXT_PUBLIC_LOCALE environment variable
 *
 * @example
 * const { t, locale } = useTranslation()
 * <h1>{t('common.loading')}</h1>
 * <p>{t('examMenu.gradeInfo', { grade: 5, count: 15 })}</p>
 */
export function useTranslation() {
  // Phase 1: Read from environment variable
  const locale = (process.env.NEXT_PUBLIC_LOCALE as Locale) || 'en'

  const t = (key: string, params?: TranslationParams): string => {
    const keys = key.split('.')

    // Try requested locale
    let value: any = locales[locale]
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    // Fallback to English if translation missing
    if (value === undefined || value === null) {
      value = locales.en
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
    }

    // Final fallback to key itself
    if (value === undefined || value === null) {
      console.warn(`[i18n] Missing translation for key: ${key} (locale: ${locale})`)
      return key
    }

    // Handle non-string values (objects, arrays, etc.)
    if (typeof value !== 'string') {
      console.warn(`[i18n] Translation key "${key}" is not a string:`, value)
      return key
    }

    // Interpolate parameters
    let text = value
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
      }
    }

    return text
  }

  return { t, locale }
}

/**
 * Export locale type for external use
 */
export type { Locale } from './types'
