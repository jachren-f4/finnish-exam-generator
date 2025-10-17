import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load staging environment
dotenv.config({ path: '.env.local.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMigration() {
  console.log('🔍 Checking if examgenie_grading table exists...\n')

  // Try to query the table
  const { data, error } = await supabase
    .from('examgenie_grading')
    .select('*')
    .limit(1)

  if (error) {
    console.log('❌ Table does NOT exist or has permissions issues')
    console.log('Error:', error.message)
    console.log('\n⚠️  Migration was NOT applied successfully!')
    return false
  }

  console.log('✅ examgenie_grading table EXISTS!')
  console.log(`   Records found: ${data ? data.length : 0}`)

  if (data && data.length > 0) {
    console.log('   Sample record:')
    console.log(JSON.stringify(data[0], null, 2))
  }

  return true
}

checkMigration().then(success => {
  process.exit(success ? 0 : 1)
})
