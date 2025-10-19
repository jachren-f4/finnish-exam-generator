/**
 * i18n Server-Side Translation Helper
 * For use in API routes and server components
 */

import { en, fi } from './locales'
import type { Locale, TranslationParams } from './types'

const locales = { en, fi }

/**
 * Get server-side translation function
 * Reads locale from NEXT_PUBLIC_LOCALE environment variable
 *
 * Phase 1: Uses environment variable
 * Phase 2: Can be enhanced to read from Accept-Language header
 *
 * @example
 * // In API route
 * import { getServerTranslation } from '@/i18n/server'
 *
 * const t = getServerTranslation()
 * return NextResponse.json({
 *   error: t('api.errors.notFound')
 * })
 */
export function getServerTranslation() {
  const locale = (process.env.NEXT_PUBLIC_LOCALE as Locale) || 'en'
  const translations = locales[locale]
  const fallback = locales.en

  const t = (key: string, params?: TranslationParams): string => {
    const keys = key.split('.')

    // Try requested locale
    let value: any = translations
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    // Fallback to English if translation missing
    if (value === undefined || value === null) {
      value = fallback
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
    }

    // Final fallback to key itself
    if (value === undefined || value === null) {
      console.warn(`[i18n:server] Missing translation for key: ${key} (locale: ${locale})`)
      return key
    }

    // Handle non-string values
    if (typeof value !== 'string') {
      console.warn(`[i18n:server] Translation key "${key}" is not a string:`, value)
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

  return t
}

/**
 * Get current server locale
 * Useful for conditional logic based on language
 */
export function getServerLocale(): Locale {
  return (process.env.NEXT_PUBLIC_LOCALE as Locale) || 'en'
}
