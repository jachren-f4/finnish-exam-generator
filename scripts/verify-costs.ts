/**
 * Cost Verification Script
 *
 * Queries the ExamGenie database to calculate total costs from:
 * - Exam creation (Gemini API)
 * - Grading (Gemini API)
 * - Audio generation (Google Cloud TTS)
 *
 * Compare these values against Google Cloud billing dashboard for verification.
 *
 * Usage:
 *   npx tsx scripts/verify-costs.ts [days]
 *
 * Example:
 *   npx tsx scripts/verify-costs.ts 30  # Last 30 days
 *   npx tsx scripts/verify-costs.ts 7   # Last 7 days
 */

import { supabaseAdmin } from '../src/lib/supabase'

interface CostSummary {
  examCreationCost: number
  gradingCost: number
  audioCost: number
  totalCost: number
  examCount: number
  gradingCount: number
  audioCount: number
  dateRange: { start: string; end: string }
}

async function verifyCosts(days = 30): Promise<void> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const endDate = new Date()

  console.log('\n' + '='.repeat(70))
  console.log('  ExamGenie Cost Verification Report')
  console.log('='.repeat(70))
  console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
  console.log(`Duration: Last ${days} days`)
  console.log('='.repeat(70) + '\n')

  try {
    if (!supabaseAdmin) {
      console.error('❌ Error: Supabase admin client not initialized')
      console.error('   Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local')
      return
    }

    // 1. Exam creation costs (Gemini API)
    console.log('📊 Querying exam creation costs...')
    const { data: exams, error: examError } = await supabaseAdmin
      .from('examgenie_exams')
      .select('created_at, creation_gemini_usage, audio_generation_cost, category, subject')
      .gte('created_at', startDate.toISOString())
      .not('creation_gemini_usage', 'is', null)

    if (examError) {
      console.error('❌ Error fetching exam costs:', examError)
      return
    }

    // 2. Grading costs (Gemini API)
    console.log('📊 Querying grading costs...')
    const { data: gradings, error: gradingError } = await supabaseAdmin
      .from('examgenie_grading')
      .select('graded_at, grading_gemini_usage, exam_id')
      .gte('graded_at', startDate.toISOString())
      .not('grading_gemini_usage', 'is', null)

    if (gradingError) {
      console.error('❌ Error fetching grading costs:', gradingError)
      return
    }

    // 3. Calculate totals
    let examCreationCost = 0
    let examCreationTokens = 0
    let gradingCost = 0
    let gradingTokens = 0
    let audioCost = 0
    let audioCharacters = 0
    let mathRetryCount = 0
    let totalRetryAttempts = 0

    // Group by category for detailed breakdown
    const costByCategory = new Map<string, { exam: number; grading: number; audio: number }>()

    exams?.forEach(exam => {
      const usage = exam.creation_gemini_usage
      if (usage) {
        examCreationCost += usage.estimatedCost || 0
        examCreationTokens += usage.totalTokenCount || 0

        // Track math retry attempts
        if (usage.mathRetryAttempts) {
          mathRetryCount++
          totalRetryAttempts += usage.mathRetryAttempts
        }
      }

      const audio = exam.audio_generation_cost
      if (audio) {
        audioCost += audio.estimatedCost || 0
        audioCharacters += audio.characterCount || 0
      }

      // Group by category
      const category = exam.category || 'unknown'
      if (!costByCategory.has(category)) {
        costByCategory.set(category, { exam: 0, grading: 0, audio: 0 })
      }
      const catCost = costByCategory.get(category)!
      catCost.exam += usage?.estimatedCost || 0
      catCost.audio += audio?.estimatedCost || 0
    })

    gradings?.forEach(grading => {
      const usage = grading.grading_gemini_usage
      if (usage) {
        gradingCost += usage.estimatedCost || 0
        gradingTokens += usage.totalTokenCount || 0
      }
    })

    const totalCost = examCreationCost + gradingCost + audioCost
    const audioExamCount = exams?.filter(e => e.audio_generation_cost).length || 0

    // 4. Display summary
    console.log('\n' + '─'.repeat(70))
    console.log('💰 COST BREAKDOWN')
    console.log('─'.repeat(70))

    console.log('\n🤖 Exam Creation (Gemini API):')
    console.log(`   Count: ${exams?.length || 0} exams`)
    console.log(`   Tokens: ${examCreationTokens.toLocaleString()}`)
    console.log(`   Cost: $${examCreationCost.toFixed(6)}`)
    console.log(`   Avg/exam: $${(examCreationCost / (exams?.length || 1)).toFixed(6)}`)
    if (mathRetryCount > 0) {
      console.log(`   Math retries: ${mathRetryCount} exams with ${totalRetryAttempts} total attempts`)
      console.log(`   Avg retry attempts: ${(totalRetryAttempts / mathRetryCount).toFixed(2)} per math exam`)
    }

    console.log('\n📝 Grading (Gemini API):')
    console.log(`   Count: ${gradings?.length || 0} gradings`)
    console.log(`   Tokens: ${gradingTokens.toLocaleString()}`)
    console.log(`   Cost: $${gradingCost.toFixed(6)}`)
    console.log(`   Avg/grading: $${(gradingCost / (gradings?.length || 1)).toFixed(6)}`)

    console.log('\n🔊 Audio Generation (Google Cloud TTS):')
    console.log(`   Count: ${audioExamCount} audios`)
    console.log(`   Characters: ${audioCharacters.toLocaleString()}`)
    console.log(`   Cost: $${audioCost.toFixed(6)}`)
    console.log(`   Avg/audio: $${(audioCost / (audioExamCount || 1)).toFixed(6)}`)

    console.log('\n' + '─'.repeat(70))
    console.log(`💵 TOTAL COST: $${totalCost.toFixed(6)}`)
    console.log('─'.repeat(70))

    // 5. Category breakdown
    if (costByCategory.size > 0) {
      console.log('\n📊 Cost by Category:')
      console.log('─'.repeat(70))
      const sortedCategories = Array.from(costByCategory.entries())
        .map(([category, costs]) => ({
          category,
          exam: costs.exam,
          grading: costs.grading,
          audio: costs.audio,
          total: costs.exam + costs.grading + costs.audio
        }))
        .sort((a, b) => b.total - a.total)

      sortedCategories.forEach(({ category, exam, grading, audio, total }) => {
        console.log(`   ${category.padEnd(20)} $${total.toFixed(6)} (exam: $${exam.toFixed(6)}, audio: $${audio.toFixed(6)})`)
      })
    }

    // 6. Verification instructions
    console.log('\n' + '='.repeat(70))
    console.log('📋 MANUAL VERIFICATION STEPS')
    console.log('='.repeat(70))

    console.log('\n1️⃣  Gemini API (Exam Creation + Grading):')
    console.log('   URL: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com')
    console.log(`   Filter: Last ${days} days`)
    console.log(`   Expected cost: $${(examCreationCost + gradingCost).toFixed(6)}`)
    console.log(`   Expected tokens: ${(examCreationTokens + gradingTokens).toLocaleString()}`)

    console.log('\n2️⃣  Google Cloud TTS (Audio Generation):')
    console.log('   URL: https://console.cloud.google.com/apis/api/texttospeech.googleapis.com')
    console.log(`   Filter: Last ${days} days`)
    console.log(`   Expected cost: $${audioCost.toFixed(6)}`)
    console.log(`   Expected characters: ${audioCharacters.toLocaleString()}`)

    console.log('\n3️⃣  BigQuery Billing Export (Optional):')
    console.log('   If you have billing export enabled, run this query:')
    console.log('\n   SELECT')
    console.log('     service.description,')
    console.log('     SUM(cost) as total_cost,')
    console.log('     SUM(usage.amount) as total_usage')
    console.log('   FROM `project.dataset.gcp_billing_export_v1_XXXXXX`')
    console.log(`   WHERE usage_start_time >= TIMESTAMP('${startDate.toISOString()}')`)
    console.log(`     AND usage_start_time < TIMESTAMP('${endDate.toISOString()}')`)
    console.log('     AND service.description IN (')
    console.log('       \'Generative Language API\',')
    console.log('       \'Cloud Text-to-Speech API\'')
    console.log('     )')
    console.log('   GROUP BY service.description')
    console.log('   ORDER BY total_cost DESC')

    console.log('\n⚠️  Expected Variance: ±5%')
    console.log('   Reasons for variance:')
    console.log('   • Rounding differences in cost calculations')
    console.log('   • Timezone discrepancies (UTC vs local)')
    console.log('   • Failed API calls that didn\'t create exams')
    console.log('   • Billing data propagation delays (can take 24-48 hours)')
    console.log('   • Additional API calls not tracked (e.g., debugging, testing)')

    console.log('\n✅  If variance >5%:')
    console.log('   1. Check for untracked API calls in application logs')
    console.log('   2. Verify math retry costs are being accumulated')
    console.log('   3. Look for API errors that consumed tokens but didn\'t create exams')
    console.log('   4. Wait 24-48 hours for billing data to fully propagate')

    console.log('\n' + '='.repeat(70))
    console.log('Report generated at: ' + new Date().toISOString())
    console.log('='.repeat(70) + '\n')

  } catch (error) {
    console.error('\n❌ Error generating cost report:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  }
}

// Parse command line arguments
const days = process.argv[2] ? parseInt(process.argv[2]) : 30

if (isNaN(days) || days <= 0) {
  console.error('Usage: npx tsx scripts/verify-costs.ts [days]')
  console.error('Example: npx tsx scripts/verify-costs.ts 30')
  process.exit(1)
}

// Run verification
verifyCosts(days)
  .then(() => {
    console.log('✅ Verification complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
