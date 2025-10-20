/**
 * Locale Exports
 *
 * Central export point for all translation files.
 */

import { en } from './en'
import { fi } from './fi'
import type { Locale, Translations } from '../types'

export const locales: Record<Locale, Translations> = {
  en,
  fi,
}

export { en, fi }
