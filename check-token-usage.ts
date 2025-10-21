#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const envFile = process.argv[2] || '.env.local'
console.log(`📁 Using environment: ${envFile}\n`)
config({ path: envFile })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTokenUsage() {
  const { data, error } = await supabase
    .from('examgenie_exams')
    .select('id, created_at, subject, creation_gemini_usage')
    .not('creation_gemini_usage', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('📊 Token Usage Summary\n')
  console.log('═══════════════════════════════════════════════════════════════')

  if (!data || data.length === 0) {
    console.log('No exams found with usage data')
    return
  }

  // Show individual exams
  console.log(`\nFound ${data.length} exams with token tracking:\n`)

  data.forEach((exam: any, i: number) => {
    const usage = exam.creation_gemini_usage
    const date = new Date(exam.created_at).toISOString().split('T')[0]
    const time = new Date(exam.created_at).toISOString().split('T')[1].split('.')[0]

    console.log(`${i + 1}. ${date} ${time} - ${exam.subject || 'Unknown'}`)
    console.log(`   Input:  ${usage.promptTokenCount?.toLocaleString() || 0} tokens ($${(usage.inputCost || 0).toFixed(6)})`)
    console.log(`   Output: ${usage.candidatesTokenCount?.toLocaleString() || 0} tokens ($${(usage.outputCost || 0).toFixed(6)})`)
    console.log(`   Total:  ${usage.totalTokenCount?.toLocaleString() || 0} tokens ($${(usage.estimatedCost || 0).toFixed(6)})`)
    console.log(`   Model:  ${usage.model || 'unknown'}`)
    console.log('')
  })

  // Calculate totals
  const totals = data.reduce((acc: any, exam: any) => {
    const usage = exam.creation_gemini_usage
    return {
      inputTokens: acc.inputTokens + (usage.promptTokenCount || 0),
      outputTokens: acc.outputTokens + (usage.candidatesTokenCount || 0),
      totalTokens: acc.totalTokens + (usage.totalTokenCount || 0),
      inputCost: acc.inputCost + (usage.inputCost || 0),
      outputCost: acc.outputCost + (usage.outputCost || 0),
      totalCost: acc.totalCost + (usage.estimatedCost || 0)
    }
  }, { inputTokens: 0, outputTokens: 0, totalTokens: 0, inputCost: 0, outputCost: 0, totalCost: 0 })

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('\n💰 ALL-TIME TOTALS\n')
  console.log(`   Exams:        ${data.length.toLocaleString()}`)
  console.log(`   Input:        ${totals.inputTokens.toLocaleString()} tokens ($${totals.inputCost.toFixed(6)})`)
  console.log(`   Output:       ${totals.outputTokens.toLocaleString()} tokens ($${totals.outputCost.toFixed(6)})`)
  console.log(`   Total:        ${totals.totalTokens.toLocaleString()} tokens ($${totals.totalCost.toFixed(6)})`)
  console.log('')
  console.log('📈 FREE TIER STATUS')
  console.log(`   Daily limit:  1,000,000 tokens`)
  console.log(`   Used today:   ${totals.totalTokens.toLocaleString()} tokens (${((totals.totalTokens / 1000000) * 100).toFixed(3)}%)`)
  console.log(`   Status:       ${totals.totalTokens < 1000000 ? '✅ Well within free tier' : '⚠️  Approaching limit'}`)
  console.log('')
}

checkTokenUsage()
