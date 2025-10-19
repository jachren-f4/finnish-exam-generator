/**
 * i18n Formatting Utilities
 * Locale-aware formatting for dates, numbers, and currency
 */

import type { Locale } from './types'

/**
 * Format date according to locale
 *
 * @param date - Date to format
 * @param locale - Target locale ('en' or 'fi')
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2025-10-17'), 'en') // "Oct 17, 2025"
 * formatDate(new Date('2025-10-17'), 'fi') // "17. lokak. 2025"
 *
 * @example
 * // Custom format
 * formatDate(new Date(), 'en', { dateStyle: 'full' })
 * // "Thursday, October 17, 2025"
 */
export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const localeCode = locale === 'fi' ? 'fi-FI' : 'en-US'
  return new Intl.DateTimeFormat(localeCode, options).format(date)
}

/**
 * Format number according to locale
 *
 * @param num - Number to format
 * @param locale - Target locale ('en' or 'fi')
 * @param options - Optional Intl.NumberFormatOptions
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1000, 'en')    // "1,000"
 * formatNumber(1000, 'fi')    // "1 000"
 * formatNumber(1234.56, 'en') // "1,234.56"
 * formatNumber(1234.56, 'fi') // "1 234,56"
 *
 * @example
 * // Custom format with decimals
 * formatNumber(3.14159, 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
 * // "3.14"
 */
export function formatNumber(
  num: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === 'fi' ? 'fi-FI' : 'en-US'
  return new Intl.NumberFormat(localeCode, options).format(num)
}

/**
 * Format currency according to locale
 *
 * @param amount - Amount to format
 * @param locale - Target locale ('en' or 'fi')
 * @param currency - Optional currency code (defaults to USD for EN, EUR for FI)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(9.99, 'en')     // "$9.99"
 * formatCurrency(9.99, 'fi')     // "9,99 €"
 * formatCurrency(1000, 'en')     // "$1,000.00"
 * formatCurrency(1000, 'fi')     // "1 000,00 €"
 *
 * @example
 * // Custom currency
 * formatCurrency(100, 'en', 'EUR') // "€100.00"
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency?: string
): string {
  const localeCode = locale === 'fi' ? 'fi-FI' : 'en-US'
  const currencyCode = currency || (locale === 'fi' ? 'EUR' : 'USD')

  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount)
}

/**
 * Format relative time (e.g., "2 hours ago", "in 5 minutes")
 *
 * @param date - Target date
 * @param locale - Target locale ('en' or 'fi')
 * @param baseDate - Base date for comparison (defaults to now)
 * @returns Formatted relative time string
 *
 * @example
 * const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
 * formatRelativeTime(pastDate, 'en') // "2 hours ago"
 * formatRelativeTime(pastDate, 'fi') // "2 tuntia sitten"
 *
 * @example
 * const futureDate = new Date(Date.now() + 5 * 60 * 1000) // in 5 minutes
 * formatRelativeTime(futureDate, 'en') // "in 5 minutes"
 * formatRelativeTime(futureDate, 'fi') // "5 minuutin kuluttua"
 */
export function formatRelativeTime(
  date: Date,
  locale: Locale,
  baseDate: Date = new Date()
): string {
  const localeCode = locale === 'fi' ? 'fi-FI' : 'en-US'
  const diffInSeconds = Math.floor((date.getTime() - baseDate.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(localeCode, { numeric: 'auto' })

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, secondsInUnit] of units) {
    const value = Math.floor(diffInSeconds / secondsInUnit)
    if (Math.abs(value) >= 1) {
      return rtf.format(value, unit)
    }
  }

  return rtf.format(0, 'second')
}

/**
 * Simple pluralization helper
 *
 * @param count - Number to check for plurality
 * @param singular - Singular form of the word
 * @param plural - Plural form of the word
 * @returns Appropriate form based on count
 *
 * @example
 * plural(1, 'question', 'questions') // "question"
 * plural(5, 'question', 'questions') // "questions"
 * plural(0, 'item', 'items') // "items"
 */
export function plural(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural
}

/**
 * Object-based pluralization with count interpolation
 * Supports both simple and complex pluralization forms
 *
 * @param count - Number to check for plurality
 * @param forms - Object with 'one' and 'other' forms, optionally 'zero'
 * @returns Formatted string with count interpolated
 *
 * @example
 * // Simple usage
 * const forms = { one: '{count} question', other: '{count} questions' }
 * pluralize(1, forms) // "1 question"
 * pluralize(5, forms) // "5 questions"
 *
 * @example
 * // With zero form
 * const forms = {
 *   zero: 'No questions',
 *   one: '{count} question',
 *   other: '{count} questions'
 * }
 * pluralize(0, forms) // "No questions"
 * pluralize(1, forms) // "1 question"
 * pluralize(5, forms) // "5 questions"
 *
 * @example
 * // Without count placeholder
 * const forms = { one: 'One item', other: 'Multiple items' }
 * pluralize(1, forms) // "One item"
 * pluralize(5, forms) // "Multiple items"
 */
export function pluralize(
  count: number,
  forms: {
    zero?: string
    one: string
    other: string
  }
): string {
  let template: string

  if (count === 0 && forms.zero) {
    template = forms.zero
  } else if (count === 1) {
    template = forms.one
  } else {
    template = forms.other
  }

  return template.replace(/\{count\}/g, String(count))
}

/**
 * Locale-aware pluralization using Intl.PluralRules
 * Handles complex plural rules for different languages
 *
 * @param count - Number to check for plurality
 * @param locale - Target locale
 * @param forms - Object with plural category keys (zero, one, two, few, many, other)
 * @returns Appropriate form based on locale plural rules
 *
 * @example
 * // English (one/other)
 * const forms = {
 *   one: '{count} item',
 *   other: '{count} items'
 * }
 * pluralizeByLocale(1, 'en', forms) // "1 item"
 * pluralizeByLocale(5, 'en', forms) // "5 items"
 *
 * @example
 * // Finnish (one/other) - same as English in this case
 * const forms = {
 *   one: '{count} kohde',
 *   other: '{count} kohdetta'
 * }
 * pluralizeByLocale(1, 'fi', forms) // "1 kohde"
 * pluralizeByLocale(5, 'fi', forms) // "5 kohdetta"
 */
export function pluralizeByLocale(
  count: number,
  locale: Locale,
  forms: {
    zero?: string
    one?: string
    two?: string
    few?: string
    many?: string
    other: string
  }
): string {
  const localeCode = locale === 'fi' ? 'fi-FI' : 'en-US'
  const pluralRules = new Intl.PluralRules(localeCode)
  const category = pluralRules.select(count)

  const template = forms[category as keyof typeof forms] || forms.other

  return template.replace(/\{count\}/g, String(count))
}
