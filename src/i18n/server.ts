/**
 * Server-Side i18n Helper
 *
 * Provides translation functions for server-side code (API routes, server components).
 * Uses NEXT_PUBLIC_LOCALE environment variable to determine language.
 */

import { locales } from './locales'
import type { Locale, Translations, NestedTranslationKey } from './types'

/**
 * Get the current locale from environment variable
 * Defaults to 'en' if not set or invalid
 */
function getCurrentLocale(): Locale {
  const locale = process.env.NEXT_PUBLIC_LOCALE as Locale
  if (locale === 'en' || locale === 'fi') {
    return locale
  }
  return 'en'
}

/**
 * Interpolate parameters in a translation string
 * Example: "Hello {name}" with {name: "World"} => "Hello World"
 */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str

  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })
}

/**
 * Get a nested translation value by key path
 * Example: "api.errors.userIdRequired" => translations.api.errors.userIdRequired
 */
function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.')
  let value: unknown = obj

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return path // Return key if not found (fallback)
    }
  }

  return typeof value === 'string' ? value : path
}

/**
 * Get server-side translations
 *
 * Usage in API routes:
 *   const t = getServerTranslation()
 *   return Response.json({
 *     error: t('api.errors.userIdRequired')
 *   })
 */
export function getServerTranslation(locale?: Locale) {
  const currentLocale = locale || getCurrentLocale()
  const translations = locales[currentLocale]

  return function t(
    key: NestedTranslationKey,
    params?: Record<string, string | number>
  ): string {
    const translated = getNestedValue(translations, key)
    return interpolate(translated, params)
  }
}

/**
 * Get translations object directly
 * Useful when you need access to multiple translations
 */
export function getServerTranslations(locale?: Locale): Translations {
  const currentLocale = locale || getCurrentLocale()
  return locales[currentLocale]
}

/**
 * Translate a single key directly
 * Convenience function for one-off translations
 */
export function translateServer(
  key: NestedTranslationKey,
  params?: Record<string, string | number>,
  locale?: Locale
): string {
  const t = getServerTranslation(locale)
  return t(key, params)
}
