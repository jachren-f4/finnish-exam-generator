// Temporary script to apply migration to staging database
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://tdrtybjaeugxhtcagluy.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcnR5YmphZXVneGh0Y2FnbHV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NTkzMiwiZXhwIjoyMDc1MzcxOTMyfQ.HhJBTUofNDeP5FRbRwH40g47DjI6lObe9G7uEHr1Cn0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251017000000_add_attempt_tracking.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Applying migration to staging database...')
    console.log('Migration SQL:', migrationSQL)

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!')
    console.log('Data:', data)

  } catch (error) {
    console.error('Error applying migration:', error)
    process.exit(1)
  }
}

applyMigration()
