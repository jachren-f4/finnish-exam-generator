/**
 * i18n Type Definitions
 * Provides type-safe translation keys and locale types
 */

import type { en } from './locales/en'

export type Locale = 'en' | 'fi'

/**
 * Utility type to extract all possible key paths from nested object
 * Supports deeply nested structures like: "common.loading" or "api.errors.notFound"
 *
 * @example
 * type Keys = DeepKeyOf<{ a: { b: { c: string } } }>
 * // Result: "a" | "a.b" | "a.b.c"
 */
export type DeepKeyOf<T> = {
  [K in keyof T & string]: T[K] extends object
    ? T[K] extends Array<any>
      ? K
      : `${K}` | `${K}.${DeepKeyOf<T[K]>}`
    : K
}[keyof T & string]

/**
 * Type representing all valid translation keys from English locale
 * This provides autocomplete and compile-time type-checking
 *
 * @example
 * // ✅ Valid - TypeScript happy
 * t('common.loading')
 * t('api.errors.notFound')
 *
 * // ❌ Invalid - TypeScript error
 * t('common.typo')
 * t('nonexistent.key')
 */
export type TranslationKey = DeepKeyOf<typeof en>

/**
 * Type representing the structure of all translations
 * Used for validating locale file structure
 */
export type TranslationKeys = typeof en

/**
 * Parameter object for translation interpolation
 * Used to replace {param} placeholders in translation strings
 *
 * @example
 * t('examMenu.gradeInfo', { grade: 5, count: 15 })
 * // Result: "Grade 5 • 15 questions"
 */
export type TranslationParams = Record<string, string | number>
