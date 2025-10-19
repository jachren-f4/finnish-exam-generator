import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load staging environment
dotenv.config({ path: '.env.local.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('🔍 Checking database tables...\n')

  // Check answers table
  const { data: answersData, error: answersError } = await supabase
    .from('answers')
    .select('*')
    .limit(1)

  console.log('answers table:', answersError ? '❌ Missing' : '✅ Exists')
  if (answersError) {
    console.log('  Error:', answersError.message)
  }

  // Check exams table (legacy)
  const { data: examsData, error: examsError } = await supabase
    .from('exams')
    .select('*')
    .limit(1)

  console.log('exams table (legacy):', examsError ? '❌ Missing' : '✅ Exists')
  if (examsError) {
    console.log('  Error:', examsError.message)
  }

  console.log('\n⚠️  Problem: submitAnswers() tries to:')
  console.log('  1. Insert into "answers" table (references "exams.exam_id")')
  console.log('  2. Create bridge record in "exams" table')
  console.log('  3. Both tables are MISSING in staging!')
}

check()
