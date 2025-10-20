/**
 * Unit Test for Shared Exam Page Translations
 *
 * Verifies that all sharedExam strings are properly translated
 * in both English and Finnish.
 */

import { locales } from './src/i18n/locales'

console.log('====================================')
console.log('Testing Shared Exam Translations')
console.log('====================================\n')

// Test 1: Check all keys exist in both locales
console.log('TEST 1: Translation Key Coverage')
console.log('---------------------------------')

const enKeys = Object.keys(locales.en.sharedExam)
const fiKeys = Object.keys(locales.fi.sharedExam)

const missingInEn = fiKeys.filter(key => !enKeys.includes(key))
const missingInFi = enKeys.filter(key => !fiKeys.includes(key))

console.log(`English keys: ${enKeys.length}`)
console.log(`Finnish keys: ${fiKeys.length}`)

if (missingInEn.length > 0) {
  console.log(`❌ Missing in English: ${missingInEn.join(', ')}`)
} else if (missingInFi.length > 0) {
  console.log(`❌ Missing in Finnish: ${missingInFi.join(', ')}`)
} else {
  console.log(`✅ All keys present in both locales`)
}

// Test 2: Verify critical translations
console.log('\nTEST 2: Critical Translations')
console.log('------------------------------')

const criticalTests = [
  { key: 'loading', en: 'Loading exam...', fi: 'Ladataan koetta...' },
  { key: 'notFound', en: 'Exam not found', fi: 'Koetta ei löytynyt' },
  { key: 'title', en: 'Shared Exam', fi: 'Jaettu koe' },
  { key: 'print', en: 'Print', fi: 'Tulosta' },
  { key: 'studentName', en: "Student's name:", fi: 'Oppilaan nimi:' },
  { key: 'created', en: 'Created:', fi: 'Luotu:' },
  { key: 'questions', en: 'Questions:', fi: 'Kysymyksiä:' },
  { key: 'totalPoints', en: 'Total points:', fi: 'Pisteitä yhteensä:' },
  { key: 'instructions', en: 'Instructions', fi: 'Ohjeet' },
  { key: 'answerPlaceholder', en: 'Write your answer here...', fi: 'Kirjoita vastauksesi tähän...' },
]

let passedTests = 0
criticalTests.forEach(test => {
  const enValue = locales.en.sharedExam[test.key as keyof typeof locales.en.sharedExam]
  const fiValue = locales.fi.sharedExam[test.key as keyof typeof locales.fi.sharedExam]

  const enMatch = enValue === test.en
  const fiMatch = fiValue === test.fi

  if (enMatch && fiMatch) {
    console.log(`✅ ${test.key}`)
    passedTests++
  } else {
    console.log(`❌ ${test.key}`)
    if (!enMatch) console.log(`   EN expected: "${test.en}", got: "${enValue}"`)
    if (!fiMatch) console.log(`   FI expected: "${test.fi}", got: "${fiValue}"`)
  }
})

console.log(`\nPassed: ${passedTests}/${criticalTests.length}`)

// Test 3: Parameter interpolation
console.log('\nTEST 3: Parameter Interpolation')
console.log('--------------------------------')

const pointsEn = locales.en.sharedExam.points
const pointsFi = locales.fi.sharedExam.points

const hasParamEn = pointsEn.includes('{points}')
const hasParamFi = pointsFi.includes('{points}')

console.log(`${hasParamEn ? '✅' : '❌'} English points template: "${pointsEn}"`)
console.log(`${hasParamFi ? '✅' : '❌'} Finnish points template: "${pointsFi}"`)

// Summary
console.log('\n====================================')
console.log('Summary')
console.log('====================================')

const totalTests = 1 + criticalTests.length + 2 // coverage + critical tests + param tests
const totalPassed =
  (missingInEn.length === 0 && missingInFi.length === 0 ? 1 : 0) +
  passedTests +
  (hasParamEn ? 1 : 0) +
  (hasParamFi ? 1 : 0)

console.log(`Total: ${totalPassed}/${totalTests} tests passed`)

if (totalPassed === totalTests) {
  console.log('\n🎉 All tests passed! Shared Exam Page is fully localized.')
  console.log('\n✅ Phase 2 Complete: Shared Exam Page translations verified')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed. Please review the output above.')
  process.exit(1)
}
