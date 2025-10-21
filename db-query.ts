#!/usr/bin/env tsx
/**
 * Database Query Tool - Supports SELECT, INSERT, UPDATE, DELETE operations
 * Usage:
 *   npx tsx db-query.ts --env=".env.local.staging" --table=examgenie_exams --limit=5
 *   npx tsx db-query.ts --env=".env.local.staging" --operation=insert --table=students --data='{"name":"Test"}'
 *   npx tsx db-query.ts --env=".env.local.staging" --operation=update --table=examgenie_exams --filter='{"id":"abc"}' --data='{"status":"READY"}'
 *   npx tsx db-query.ts --env=".env.local.staging" --operation=delete --table=examgenie_exams --filter='{"id":"abc"}'
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Parse command line arguments
const args = process.argv.slice(2)
const params: Record<string, string> = {}

args.forEach(arg => {
  const [key, value] = arg.split('=')
  if (key && value) {
    params[key.replace('--', '')] = value
  }
})

// Load environment variables
const envFile = params.env || '.env.local'
const envPath = path.resolve(process.cwd(), envFile)
console.log(`🔧 Loading environment from: ${envPath}`)
dotenv.config({ path: envPath })

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in environment')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.error('   This key is required for write operations (INSERT, UPDATE, DELETE)')
  process.exit(1)
}

// Create Supabase client with SERVICE ROLE KEY for write operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

console.log(`✅ Connected to: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
console.log(`🔑 Using: SERVICE_ROLE_KEY (write operations enabled)\n`)

// Main execution
async function main() {
  const operation = (params.operation || 'select').toLowerCase()
  const table = params.table
  const limit = parseInt(params.limit || '10')

  if (!table) {
    console.error('❌ Error: --table parameter is required')
    console.log('\nUsage examples:')
    console.log('  SELECT:  npx tsx db-query.ts --env=".env.local.staging" --table=examgenie_exams --limit=5')
    console.log('  INSERT:  npx tsx db-query.ts --env=".env.local.staging" --operation=insert --table=students --data=\'{"name":"Test"}\'')
    console.log('  UPDATE:  npx tsx db-query.ts --env=".env.local.staging" --operation=update --table=examgenie_exams --filter=\'{"id":"abc"}\' --data=\'{"status":"READY"}\'')
    console.log('  DELETE:  npx tsx db-query.ts --env=".env.local.staging" --operation=delete --table=examgenie_exams --filter=\'{"id":"abc"}\'')
    process.exit(1)
  }

  try {
    switch (operation) {
      case 'select':
        await selectOperation(table, limit)
        break

      case 'insert':
        await insertOperation(table, params.data)
        break

      case 'update':
        await updateOperation(table, params.filter, params.data)
        break

      case 'delete':
        await deleteOperation(table, params.filter)
        break

      case 'count':
        await countOperation(table, params.filter)
        break

      default:
        console.error(`❌ Unknown operation: ${operation}`)
        console.log('   Supported operations: select, insert, update, delete, count')
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Database operation failed:', error)
    process.exit(1)
  }
}

// SELECT operation
async function selectOperation(table: string, limit: number) {
  console.log(`📊 Executing: SELECT * FROM ${table} LIMIT ${limit}\n`)

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ Query error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('📭 No results found')
    return
  }

  console.log(`✅ Found ${data.length} record(s)\n`)

  // Pretty print results
  data.forEach((record, index) => {
    console.log(`━━━ Record ${index + 1} ━━━`)

    // Format each field
    Object.entries(record).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        console.log(`  ${key}: <null>`)
      } else if (typeof value === 'object') {
        console.log(`  ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n    ')}`)
      } else if (typeof value === 'string' && value.length > 100) {
        console.log(`  ${key}: ${value.substring(0, 100)}... (${value.length} chars)`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    console.log('')
  })
}

// INSERT operation
async function insertOperation(table: string, dataJson: string | undefined) {
  if (!dataJson) {
    console.error('❌ Error: --data parameter is required for INSERT')
    console.log('   Example: --data=\'{"name":"Test Student","grade":5}\'')
    process.exit(1)
  }

  let data: any
  try {
    data = JSON.parse(dataJson)
  } catch (e) {
    console.error('❌ Error: Invalid JSON in --data parameter')
    console.log('   Received:', dataJson)
    process.exit(1)
  }

  console.log(`📝 Executing: INSERT INTO ${table}`)
  console.log(`   Data:`, JSON.stringify(data, null, 2), '\n')

  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()

  if (error) {
    console.error('❌ Insert error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
    process.exit(1)
  }

  console.log('✅ Insert successful!')
  console.log('   Inserted record:', JSON.stringify(result, null, 2))
}

// UPDATE operation
async function updateOperation(table: string, filterJson: string | undefined, dataJson: string | undefined) {
  if (!filterJson) {
    console.error('❌ Error: --filter parameter is required for UPDATE')
    console.log('   Example: --filter=\'{"id":"abc-123"}\'')
    process.exit(1)
  }

  if (!dataJson) {
    console.error('❌ Error: --data parameter is required for UPDATE')
    console.log('   Example: --data=\'{"status":"READY"}\'')
    process.exit(1)
  }

  let filter: any, data: any
  try {
    filter = JSON.parse(filterJson)
    data = JSON.parse(dataJson)
  } catch (e) {
    console.error('❌ Error: Invalid JSON in --filter or --data parameter')
    process.exit(1)
  }

  console.log(`✏️  Executing: UPDATE ${table}`)
  console.log(`   Filter:`, JSON.stringify(filter, null, 2))
  console.log(`   Data:`, JSON.stringify(data, null, 2), '\n')

  // Build the query with filters
  let query = supabase.from(table).update(data)

  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { data: result, error } = await query.select()

  if (error) {
    console.error('❌ Update error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
    process.exit(1)
  }

  if (!result || result.length === 0) {
    console.log('⚠️  No records matched the filter criteria')
    return
  }

  console.log(`✅ Update successful! Updated ${result.length} record(s)`)
  console.log('   Updated records:', JSON.stringify(result, null, 2))
}

// DELETE operation
async function deleteOperation(table: string, filterJson: string | undefined) {
  if (!filterJson) {
    console.error('❌ Error: --filter parameter is required for DELETE')
    console.log('   Example: --filter=\'{"id":"abc-123"}\'')
    process.exit(1)
  }

  let filter: any
  try {
    filter = JSON.parse(filterJson)
  } catch (e) {
    console.error('❌ Error: Invalid JSON in --filter parameter')
    process.exit(1)
  }

  console.log(`🗑️  Executing: DELETE FROM ${table}`)
  console.log(`   Filter:`, JSON.stringify(filter, null, 2), '\n')

  // Build the query with filters
  let query = supabase.from(table).delete()

  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { data: result, error } = await query.select()

  if (error) {
    console.error('❌ Delete error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
    process.exit(1)
  }

  if (!result || result.length === 0) {
    console.log('⚠️  No records matched the filter criteria')
    return
  }

  console.log(`✅ Delete successful! Deleted ${result.length} record(s)`)
  console.log('   Deleted records:', JSON.stringify(result, null, 2))
}

// COUNT operation
async function countOperation(table: string, filterJson: string | undefined) {
  console.log(`🔢 Executing: SELECT COUNT(*) FROM ${table}`)

  let query = supabase.from(table).select('*', { count: 'exact', head: true })

  if (filterJson) {
    try {
      const filter = JSON.parse(filterJson)
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      console.log(`   Filter:`, JSON.stringify(filter, null, 2))
    } catch (e) {
      console.error('❌ Error: Invalid JSON in --filter parameter')
      process.exit(1)
    }
  }

  const { count, error } = await query

  if (error) {
    console.error('❌ Count error:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Total records: ${count}`)
}

// Run main function
main()
