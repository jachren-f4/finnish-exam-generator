import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local.staging' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verify() {
  const { data, error } = await supabase
    .from('examgenie_grading')
    .select('grading_id, exam_id, final_grade, attempt_number, graded_at')
    .order('graded_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Latest grading records:')
    console.log(JSON.stringify(data, null, 2))
  }
}

verify()
