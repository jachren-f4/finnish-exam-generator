// Test script to verify generation_prompt is saved to database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPrompt() {
  console.log('Checking most recent exam for generation_prompt...\n')

  const { data, error } = await supabase
    .from('examgenie_exams')
    .select('id, subject, grade, created_at, generation_prompt')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!data) {
    console.log('No exams found')
    return
  }

  console.log('Most recent exam:')
  console.log('  ID:', data.id)
  console.log('  Subject:', data.subject)
  console.log('  Grade:', data.grade)
  console.log('  Created:', data.created_at)
  console.log('\nGeneration Prompt:')

  if (data.generation_prompt) {
    console.log('✅ SAVED TO DATABASE')
    console.log('\nPrompt preview (first 500 chars):')
    console.log(data.generation_prompt.substring(0, 500))
    console.log('\nPrompt length:', data.generation_prompt.length, 'characters')
  } else {
    console.log('❌ NOT SAVED - generation_prompt is null')
  }
}

checkPrompt()
