/**
 * Supabase Migration Runner
 *
 * Runs the api_request_logs table migration directly through Supabase client.
 *
 * Usage:
 *   npx ts-node scripts/run-migration.ts
 *
 * Or execute the SQL directly in Supabase dashboard:
 *   https://app.supabase.com/project/<your-project>/sql
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Supabase credentials not configured')
    console.error('Required environment variables:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔧 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251008_create_api_request_logs.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found at ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded:')
  console.log(`   ${migrationPath}`)
  console.log(`   ${migrationSQL.split('\n').length} lines`)

  console.log('\n⚠️  MANUAL MIGRATION REQUIRED')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nSupabase client doesn\'t support direct SQL execution.')
  console.log('Please run this migration manually in one of these ways:\n')

  console.log('Option 1: Supabase Dashboard (Recommended)')
  console.log('  1. Go to: https://app.supabase.com/project/<your-project>/sql')
  console.log('  2. Create a new query')
  console.log('  3. Copy the SQL from: supabase/migrations/20251008_create_api_request_logs.sql')
  console.log('  4. Click "Run"\n')

  console.log('Option 2: Supabase CLI')
  console.log('  1. Install: npm install -g supabase')
  console.log('  2. Login: supabase login')
  console.log('  3. Link: supabase link --project-ref <your-project-ref>')
  console.log('  4. Run: supabase db push\n')

  console.log('Option 3: psql (if you have direct database access)')
  console.log('  psql "<connection-string>" -f supabase/migrations/20251008_create_api_request_logs.sql\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log('\n✅ Migration SQL preview:\n')
  console.log(migrationSQL)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runMigration().catch(error => {
  console.error('❌ Migration script error:', error)
  process.exit(1)
})
