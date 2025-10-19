/**
 * Locale Validation Script
 * Ensures translation structure matches between EN and FI
 *
 * Run: npx tsx scripts/validate-locales.ts
 * Or: npm run test:i18n
 */

import { en } from '../src/i18n/locales/en'
import { fi } from '../src/i18n/locales/fi'

/**
 * Recursively extract all keys from a nested object
 * @param obj - Object to extract keys from
 * @param prefix - Current key prefix for nested objects
 * @returns Array of dot-notation keys
 */
function getKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).flatMap(key => {
    const value = obj[key]
    const fullKey = prefix ? `${prefix}.${key}` : key

    // Skip if value is object (but not null or array)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeys(value, fullKey)
    }

    return [fullKey]
  })
}

/**
 * Main validation function
 */
function validateLocales() {
  console.log('🌍 Validating locale structure...\n')

  // Extract all keys from both locales
  const enKeys = getKeys(en).sort()
  const fiKeys = getKeys(fi).sort()

  console.log(`📊 Statistics:`)
  console.log(`   English keys: ${enKeys.length}`)
  console.log(`   Finnish keys: ${fiKeys.length}`)
  console.log('')

  // Find mismatches
  const missingInFi = enKeys.filter(k => !fiKeys.includes(k))
  const extraInFi = fiKeys.filter(k => !enKeys.includes(k))

  let hasErrors = false

  // Report missing translations in Finnish
  if (missingInFi.length > 0) {
    hasErrors = true
    console.error('❌ Missing in Finnish locale:')
    missingInFi.forEach(key => {
      console.error(`   - ${key}`)
    })
    console.error('')
  }

  // Report extra translations in Finnish
  if (extraInFi.length > 0) {
    hasErrors = true
    console.error('❌ Extra keys in Finnish locale (not in English):')
    extraInFi.forEach(key => {
      console.error(`   - ${key}`)
    })
    console.error('')
  }

  // Final result
  if (hasErrors) {
    console.error('❌ Translation structure mismatch detected!')
    console.error('   Please ensure both locale files have identical structure.\n')
    process.exit(1)
  } else {
    console.log('✅ All translations match!')
    console.log(`   ${enKeys.length} keys validated successfully\n`)
    process.exit(0)
  }
}

// Run validation
validateLocales()
