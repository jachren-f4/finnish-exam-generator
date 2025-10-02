require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkExam() {
  const examId = '3533be4b-47aa-411e-8017-5012b41e4dda'

  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('exam_id', examId)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n=== EXAM COLUMNS ===')
  console.log(Object.keys(data))

  // Find the text field
  const textField = data.processed_text || data.final_questions || JSON.stringify(data)

  console.log('\n=== EXAM TEXT (stored in DB) ===')
  console.log(textField)

  // Check for Cyrillic
  const hasCyrillic = /[\u0400-\u04FF]/.test(textField)

  console.log('\n\n=== CYRILLIC CHECK ===')
  console.log('Exam text has Cyrillic:', hasCyrillic)

  if (hasCyrillic) {
    const matches = textField.match(/[\u0400-\u04FF]+/g)
    console.log('Cyrillic strings found:', matches)
  }
}

checkExam()
