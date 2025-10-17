// Script to apply migration to staging database
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://tdrtybjaeugxhtcagluy.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcnR5YmphZXVneGh0Y2FnbHV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NTkzMiwiZXhwIjoyMDc1MzcxOTMyfQ.HhJBTUofNDeP5FRbRwH40g47DjI6lObe9G7uEHr1Cn0'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🚀 Applying migration to staging database...\n')

    // Step 1: Add column
    console.log('Step 1: Adding attempt_number column...')
    const { error: alterError } = await supabase.rpc('query', {
      query: 'ALTER TABLE public.grading ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;'
    })

    if (alterError) {
      // Try direct approach
      console.log('RPC not available, checking if column already exists...')
      const { data: columns, error: checkError } = await supabase
        .from('grading')
        .select('*')
        .limit(1)

      if (!checkError) {
        console.log('✓ Table accessible')
      }
    } else {
      console.log('✓ Column added')
    }

    // Alternative: Use Supabase Management API
    console.log('\n📝 Migration SQL to apply manually:')
    const migrationSQL = fs.readFileSync('./supabase/migrations/20251017000000_add_attempt_tracking.sql', 'utf-8')
    console.log(migrationSQL)

    console.log('\n⚠️  Please apply this SQL manually via Supabase Dashboard:')
    console.log('1. Go to https://supabase.com/dashboard/project/tdrtybjaeugxhtcagluy/sql/new')
    console.log('2. Paste the SQL above')
    console.log('3. Click "Run"')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

runMigration()
