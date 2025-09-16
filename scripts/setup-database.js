const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  console.error('')
  console.error('Please update your .env.local file with the service role key.')
  console.error('You can find it in your Supabase project settings under API.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Setting up ExamGenie MVP database schema...')

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_examgenie_mvp_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Executing ${statements.length} database statements...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n[${i + 1}/${statements.length}] Executing:`)
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''))

      const { data, error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // Continue with other statements for non-critical errors
        if (error.message.includes('already exists')) {
          console.log('  → Skipping (already exists)')
        } else {
          console.error('  → Failed:', error.message)
        }
      } else {
        console.log('  ✓ Success')
      }
    }

    console.log('\n✅ Database setup completed!')
    console.log('\nNext steps:')
    console.log('1. Enable Google OAuth in your Supabase Auth settings')
    console.log('2. Test the authentication flow')
    console.log('3. Create student management endpoints')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Alternative method using direct SQL execution
async function setupDatabaseDirect() {
  try {
    console.log('Setting up ExamGenie MVP database schema (direct method)...')

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_examgenie_mvp_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Executing migration SQL...')

    // Try to execute the entire migration at once
    const { data, error } = await supabase
      .from('any_table') // This will fail, but we'll catch it
      .select('*')
      .limit(0)

    console.log('\n⚠️  Direct SQL execution not available through Supabase client.')
    console.log('Please apply the migration manually:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of:')
    console.log('   supabase/migrations/001_examgenie_mvp_schema.sql')
    console.log('4. Execute the migration')

    console.log('\nMigration file location:')
    console.log(migrationPath)

  } catch (error) {
    console.log('\n⚠️  Please apply the database migration manually:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of:')
    console.log('   supabase/migrations/001_examgenie_mvp_schema.sql')
    console.log('4. Execute the migration')
  }
}

// Run the setup
setupDatabaseDirect()