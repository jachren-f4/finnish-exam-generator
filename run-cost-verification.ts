#!/usr/bin/env tsx
/**
 * Cost Verification Script
 * Runs the SQL queries from COST_VERIFICATION_GUIDE.md against the database
 * and displays the results for comparison with Google Cloud billing.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runCostVerification() {
  console.log('\n📊 ExamGenie Cost Verification Report')
  console.log('=====================================\n')

  // Query 1: Total Gemini costs (last 30 days)
  console.log('🔍 Querying Gemini API costs...')
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: geminiExams, error: geminiError } = await supabase
    .from('examgenie_exams')
    .select('creation_gemini_usage')
    .gt('created_at', thirtyDaysAgo)
    .not('creation_gemini_usage', 'is', null)

  if (geminiError) {
    console.error('❌ Gemini query failed:', geminiError.message)
  } else {
    const examCount = geminiExams?.length || 0
    const totalGeminiCost = geminiExams?.reduce((sum: number, row: any) => {
      return sum + (parseFloat(row.creation_gemini_usage?.estimatedCost) || 0)
    }, 0) || 0
    const avgCost = examCount > 0 ? totalGeminiCost / examCount : 0
    const totalTokens = geminiExams?.reduce((sum: number, row: any) => {
      return sum + (parseInt(row.creation_gemini_usage?.totalTokenCount) || 0)
    }, 0) || 0

    console.log('\n📈 Gemini API Costs (Last 30 Days)')
    console.log('─────────────────────────────────────')
    console.log(`   Exams generated: ${examCount}`)
    console.log(`   Total cost:      $${totalGeminiCost.toFixed(6)}`)
    console.log(`   Avg per exam:    $${avgCost.toFixed(6)}`)
    console.log(`   Total tokens:    ${totalTokens.toLocaleString()}`)
  }

  // Query 2: Total TTS costs (last 30 days)
  console.log('\n🔍 Querying Google Cloud TTS costs...')
  const { data: ttsData, error: ttsError } = await supabase
    .from('examgenie_exams')
    .select('audio_generation_cost')
    .gt('created_at', thirtyDaysAgo)
    .not('audio_generation_cost', 'is', null)
    .gt('audio_generation_cost', 0)

  if (ttsError) {
    console.error('❌ TTS query failed:', ttsError.message)
  } else {
    const audioCount = ttsData?.length || 0
    const totalTtsCost = ttsData?.reduce((sum: number, row: any) => {
      return sum + (parseFloat(row.audio_generation_cost) || 0)
    }, 0) || 0
    const avgTtsCost = audioCount > 0 ? totalTtsCost / audioCount : 0

    console.log('\n🎙️  Google Cloud TTS Costs (Last 30 Days)')
    console.log('─────────────────────────────────────')
    console.log(`   Audio files:     ${audioCount}`)
    console.log(`   Total cost:      $${totalTtsCost.toFixed(6)}`)
    console.log(`   Avg per audio:   $${avgTtsCost.toFixed(6)}`)
  }

  // Query 3: Daily breakdown (last 7 days for summary)
  console.log('\n🔍 Querying daily cost breakdown...')
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: dailyData, error: dailyError } = await supabase
    .from('examgenie_exams')
    .select('created_at, creation_gemini_usage, audio_generation_cost')
    .gt('created_at', sevenDaysAgo)
    .not('creation_gemini_usage', 'is', null)

  if (dailyError) {
    console.error('❌ Daily breakdown query failed:', dailyError.message)
  } else {
    // Group by date
    const dailyCosts = new Map<string, { exams: number; gemini: number; tts: number }>()

    dailyData?.forEach((row: any) => {
      const date = new Date(row.created_at).toISOString().split('T')[0]
      const existing = dailyCosts.get(date) || { exams: 0, gemini: 0, tts: 0 }

      existing.exams += 1
      existing.gemini += parseFloat(row.creation_gemini_usage?.estimatedCost || 0)
      existing.tts += parseFloat(row.audio_generation_cost || 0)

      dailyCosts.set(date, existing)
    })

    console.log('\n📅 Daily Cost Breakdown (Last 7 Days)')
    console.log('─────────────────────────────────────')

    const sortedDates = Array.from(dailyCosts.keys()).sort().reverse()
    sortedDates.forEach(date => {
      const costs = dailyCosts.get(date)!
      const total = costs.gemini + costs.tts
      console.log(`   ${date}: ${costs.exams} exams | Gemini: $${costs.gemini.toFixed(4)} | TTS: $${costs.tts.toFixed(4)} | Total: $${total.toFixed(4)}`)
    })
  }

  // Summary
  console.log('\n💰 Summary')
  console.log('─────────────────────────────────────')
  const totalGeminiCostFinal = geminiExams?.reduce((sum: number, row: any) => {
    return sum + (parseFloat(row.creation_gemini_usage?.estimatedCost) || 0)
  }, 0) || 0
  const totalTtsFinal = ttsData?.reduce((sum: number, row: any) => {
    return sum + (parseFloat(row.audio_generation_cost) || 0)
  }, 0) || 0
  const grandTotal = totalGeminiCostFinal + totalTtsFinal

  if (grandTotal > 0) {
    console.log(`   Total tracked (30 days): $${grandTotal.toFixed(6)}`)
    console.log(`   - Gemini API:            $${totalGeminiCostFinal.toFixed(6)} (${((totalGeminiCostFinal / grandTotal) * 100).toFixed(1)}%)`)
    console.log(`   - Cloud TTS:             $${totalTtsFinal.toFixed(6)} (${((totalTtsFinal / grandTotal) * 100).toFixed(1)}%)`)
  } else {
    console.log(`   Total tracked (30 days): $0.000000 (no data)`)
  }

  console.log('\n📋 Next Steps:')
  console.log('   1. Go to https://aistudio.google.com/ → Billing')
  console.log('   2. Filter by "Gemini API" for last 30 days')
  console.log('   3. Compare with Gemini total above')
  console.log('   4. Go to https://console.cloud.google.com/billing/reports')
  console.log('   5. Filter by "Cloud Text-to-Speech API" for last 30 days')
  console.log('   6. Compare with TTS total above')
  console.log('   7. Variance within ±5% is acceptable\n')
}

runCostVerification().catch(console.error)
