#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

async function checkDatabase(envFile: string) {
  config({ path: envFile })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.log(`❌ ${envFile}: Missing credentials\n`)
    return
  }

  const supabase = createClient(url, key)

  // Check examgenie_exams table
  const { data: exams, error } = await supabase
    .from('examgenie_exams')
    .select('id, created_at, creation_gemini_usage', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1000)

  console.log(`\n📊 ${envFile}`)
  console.log(`   Database URL: ${url}`)

  if (error) {
    console.log(`   ❌ Error: ${error.message}\n`)
    return
  }

  const totalExams = exams?.length || 0
  const examsWithCosts = exams?.filter((e: any) => e.creation_gemini_usage) || []

  console.log(`   Total exams: ${totalExams}`)
  console.log(`   With cost tracking: ${examsWithCosts.length}`)

  if (examsWithCosts.length > 0) {
    const oldest = examsWithCosts[examsWithCosts.length - 1]
    const newest = examsWithCosts[0]
    console.log(`   Date range: ${new Date(oldest.created_at).toISOString().split('T')[0]} to ${new Date(newest.created_at).toISOString().split('T')[0]}`)

    const totalTokens = examsWithCosts.reduce((sum: number, e: any) =>
      sum + (e.creation_gemini_usage?.totalTokenCount || 0), 0)
    const totalCost = examsWithCosts.reduce((sum: number, e: any) =>
      sum + (e.creation_gemini_usage?.estimatedCost || 0), 0)

    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`)
    console.log(`   Total cost: $${totalCost.toFixed(6)}`)
  }
  console.log('')
}

async function main() {
  console.log('🔍 Checking ALL databases for exam data...\n')
  console.log('═══════════════════════════════════════════════════════════════')

  await checkDatabase('.env.local')
  await checkDatabase('.env.local.staging')
  await checkDatabase('.env.local.production')

  console.log('═══════════════════════════════════════════════════════════════')
}

main()
