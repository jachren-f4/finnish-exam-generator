require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkQ1() {
  const examId = '885b2b02-3ba3-4130-9e17-d2e34fb13fe3'

  // First, let's see what tables and columns we have
  const { data: questions, error } = await supabase
    .from('examgenie_questions')
    .select('*')
    .eq('exam_id', examId)
    .eq('question_number', 1)
    .single()

  if (error) {
    console.error('Error fetching from questions table:', error)

    // Try alternative: check if it's stored in exam table
    const { data: exam, error: examError } = await supabase
      .from('examgenie_exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examError) {
      console.error('Error fetching from exams table:', examError)
      return
    }

    console.log('\n=== EXAM DATA ===')
    console.log('Columns:', Object.keys(exam))

    // Try to find the questions data
    const examJson = exam.exam_json || exam.processed_text || exam.final_questions
    if (examJson) {
      const parsed = typeof examJson === 'string' ? JSON.parse(examJson) : examJson
      console.log('\n=== QUESTION 1 ===')
      console.log(JSON.stringify(parsed.questions[0], null, 2))
    }
    return
  }

  console.log('\n=== QUESTION 1 FROM QUESTIONS TABLE ===')
  console.log(JSON.stringify(questions, null, 2))
}

checkQ1()
