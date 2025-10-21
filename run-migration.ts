#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Load environment
dotenv.config({ path: '.env.local.staging' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local.staging')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔄 Reading migration file...')
  const sql = fs.readFileSync('./supabase/migrations/20251021000000_add_key_concepts.sql', 'utf-8')

  console.log('🔄 Running key_concepts migration on staging database...')
  console.log(`📍 Database: ${supabaseUrl}`)

  // Split by semicolon and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  console.log(`\n📊 Total statements to execute: ${statements.length}`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim()
    if (!statement) continue

    console.log(`\n📝 Statement ${i + 1}/${statements.length}:`)
    console.log(statement.substring(0, 150) + '...')

    // Use raw SQL query directly
    try {
      const { data, error } = await (supabase as any).rpc('exec_sql', {
        sql_query: statement + ';'
      })

      if (error) {
        console.error(`❌ RPC Error:`, error.message)
        console.log('Note: Some errors may be safe to ignore (e.g., "column already exists")')
      } else {
        console.log('✅ Success')
      }
    } catch (err: any) {
      console.error(`❌ Exception:`, err.message)
      console.log('Note: Continuing with remaining statements...')
    }
  }

  console.log('\n✅ Migration execution complete!')

  // Verify columns were added
  console.log('\n🔍 Verifying key_concepts column...')
  const { data, error } = await supabase
    .from('examgenie_exams')
    .select('id, key_concepts, gamification')
    .limit(1)

  if (error) {
    console.error('❌ Verification failed:', error.message)
    console.log('This may mean the columns were not added successfully.')
  } else {
    console.log('✅ Columns key_concepts and gamification are accessible!')
    console.log('Sample data:', data)
  }
}

runMigration().catch(console.error)
