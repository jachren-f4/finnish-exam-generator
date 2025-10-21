/**
 * i18n Main Module
 *
 * Provides the useTranslation hook for client-side translations.
 * Uses NEXT_PUBLIC_LOCALE environment variable to determine language.
 */

'use client'

import { locales } from './locales'
import type { Locale, Translations, NestedTranslationKey } from './types'

/**
 * Get the current locale from override or environment variable
 * Defaults to 'en' if not set or invalid
 * @param overrideLocale - Optional locale override (e.g., from exam's detected_language)
 */
function getCurrentLocale(overrideLocale?: string | null): Locale {
  // Priority: override > environment variable > default
  const locale = overrideLocale || process.env.NEXT_PUBLIC_LOCALE as Locale
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
 * Example: "examMenu.title" => translations.examMenu.title
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
 * Translation function type
 */
export type TranslateFn = (
  key: NestedTranslationKey,
  params?: Record<string, string | number>
) => string

/**
 * useTranslation Hook
 *
 * Returns a translation function for the current locale.
 * Usage:
 *   const { t } = useTranslation()
 *   <h1>{t('examMenu.title')}</h1>
 *   <p>{t('examMenu.gradeInfo', { grade: 5, count: 15 })}</p>
 *
 * With language override (auto-detect from exam):
 *   const { t } = useTranslation(exam?.detected_language)
 *   // Will use exam's detected language instead of NEXT_PUBLIC_LOCALE
 *
 * @param overrideLocale - Optional locale to use instead of environment variable (e.g., exam.detected_language)
 */
export function useTranslation(overrideLocale?: string | null) {
  const locale = getCurrentLocale(overrideLocale)
  const translations = locales[locale]

  const t: TranslateFn = (key, params) => {
    const translated = getNestedValue(translations, key)
    return interpolate(translated, params)
  }

  return { t, locale }
}

/**
 * Get translations directly (non-hook version)
 * Useful for utility functions or outside React components
 */
export function getTranslations(locale?: Locale): Translations {
  const currentLocale = locale || getCurrentLocale()
  return locales[currentLocale]
}

/**
 * Translate a key directly without using the hook
 * Useful for non-React contexts
 */
export function translate(
  key: NestedTranslationKey,
  params?: Record<string, string | number>,
  locale?: Locale
): string {
  const translations = getTranslations(locale)
  const translated = getNestedValue(translations, key)
  return interpolate(translated, params)
}
