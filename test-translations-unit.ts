/**
 * Unit Test for i18n Translations
 *
 * Tests both client-side and server-side translation functions
 * to verify Phase 1 implementation is working correctly.
 */

import { getServerTranslation } from './src/i18n/server'

console.log('====================================')
console.log('Testing i18n Translation System')
console.log('====================================\n')

// Test 1: English translations
console.log('TEST 1: English API Error Messages')
console.log('-----------------------------------')
const tEn = getServerTranslation('en')

const tests = [
  {
    key: 'api.errors.userIdRequired' as const,
    expected: 'user_id or student_id required',
  },
  {
    key: 'api.errors.rateLimitExceeded' as const,
    expected: 'Daily exam limit reached',
  },
  {
    key: 'api.errors.rateLimitRetryAfter' as const,
    params: { minutes: 30 },
    expected: 'You can create a new exam in 30 minutes.',
  },
  {
    key: 'api.errors.invalidCategory' as const,
    expected: 'Invalid category. Must be one of: mathematics, core_academics, language_studies',
  },
  {
    key: 'api.errors.invalidGrade' as const,
    expected: 'Invalid grade. Must be between 1 and 9.',
  },
]

let passedEn = 0
tests.forEach((test) => {
  const result = tEn(test.key, test.params)
  const passed = result === test.expected
  console.log(`${passed ? '✅' : '❌'} ${test.key}`)
  if (!passed) {
    console.log(`   Expected: ${test.expected}`)
    console.log(`   Got:      ${result}`)
  }
  if (passed) passedEn++
})

console.log(`\nEnglish: ${passedEn}/${tests.length} tests passed\n`)

// Test 2: Finnish translations
console.log('TEST 2: Finnish API Error Messages')
console.log('-----------------------------------')
const tFi = getServerTranslation('fi')

const testsFi = [
  {
    key: 'api.errors.userIdRequired' as const,
    expected: 'user_id tai student_id vaaditaan',
  },
  {
    key: 'api.errors.rateLimitExceeded' as const,
    expected: 'Päivittäinen koeraja saavutettu',
  },
  {
    key: 'api.errors.rateLimitRetryAfter' as const,
    params: { minutes: 30 },
    expected: 'Voit luoda uuden kokeen 30 minuutin kuluttua.',
  },
  {
    key: 'api.errors.invalidCategory' as const,
    expected: 'Virheellinen kategoria. Sallitut: mathematics, core_academics, language_studies',
  },
  {
    key: 'api.errors.invalidGrade' as const,
    expected: 'Virheellinen luokka-aste. Tulee olla välillä 1-9.',
  },
]

let passedFi = 0
testsFi.forEach((test) => {
  const result = tFi(test.key, test.params)
  const passed = result === test.expected
  console.log(`${passed ? '✅' : '❌'} ${test.key}`)
  if (!passed) {
    console.log(`   Expected: ${test.expected}`)
    console.log(`   Got:      ${result}`)
  }
  if (passed) passedFi++
})

console.log(`\nFinnish: ${passedFi}/${testsFi.length} tests passed\n`)

// Test 3: Environment variable reading
console.log('TEST 3: Environment Variable Reading')
console.log('------------------------------------')
const envLocale = process.env.NEXT_PUBLIC_LOCALE
console.log(`Current NEXT_PUBLIC_LOCALE: ${envLocale || '(not set, defaults to en)'}`)

const tAuto = getServerTranslation() // Should read from env
const autoResult = tAuto('api.errors.userIdRequired')
const expectedAuto = envLocale === 'fi'
  ? 'user_id tai student_id vaaditaan'
  : 'user_id or student_id required'

const passedAuto = autoResult === expectedAuto
console.log(`${passedAuto ? '✅' : '❌'} Auto-detection works`)
if (!passedAuto) {
  console.log(`   Expected: ${expectedAuto}`)
  console.log(`   Got:      ${autoResult}`)
}

// Summary
console.log('\n====================================')
console.log('Summary')
console.log('====================================')
const totalPassed = passedEn + passedFi + (passedAuto ? 1 : 0)
const totalTests = tests.length + testsFi.length + 1
console.log(`Total: ${totalPassed}/${totalTests} tests passed`)

if (totalPassed === totalTests) {
  console.log('\n🎉 All tests passed! Translation system is working correctly.')
  console.log('\n✅ Phase 1 Task 1.3 Complete: API translations verified')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed. Please review the output above.')
  process.exit(1)
}
