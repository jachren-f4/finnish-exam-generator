#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAllExams() {
  const { data, error } = await supabase
    .from('examgenie_exams')
    .select('created_at, creation_gemini_usage')
    .not('creation_gemini_usage', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`\n📊 Total exams with cost tracking: ${data?.length || 0}\n`)

  if (data && data.length > 0) {
    console.log('Recent exams:')
    data.slice(0, 10).forEach((exam: any, i: number) => {
      const cost = parseFloat(exam.creation_gemini_usage?.estimatedCost || 0)
      const date = new Date(exam.created_at).toISOString().split('T')[0]
      console.log(`  ${i + 1}. ${date} - $${cost.toFixed(6)}`)
    })

    const totalCost = data.reduce((sum: number, exam: any) => {
      return sum + (parseFloat(exam.creation_gemini_usage?.estimatedCost) || 0)
    }, 0)

    console.log(`\n💰 Total cost (all time): $${totalCost.toFixed(6)}`)
  }
}

checkAllExams()
