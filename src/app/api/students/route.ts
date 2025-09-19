import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { Student } from '@/lib/supabase'

// GET /api/students - Get user's students
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching students:', error)
        return NextResponse.json(
          { error: 'Failed to fetch students' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        students: students || [],
        count: students?.length || 0
      })

    } catch (error) {
      console.error('Students GET error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// POST /api/students - Create new student
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const body = await req.json()
      const { name, grade, language } = body

      // Validate input
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Student name is required' },
          { status: 400 }
        )
      }

      if (!grade || typeof grade !== 'number' || grade < 1 || grade > 9) {
        return NextResponse.json(
          { error: 'Grade must be between 1 and 9' },
          { status: 400 }
        )
      }

      // Validate language (default to 'en' if not provided)
      const validLanguages = ['en', 'fi', 'sv', 'es', 'fr', 'de', 'it', 'pt', 'et', 'no', 'da', 'nl']
      const studentLanguage = language && validLanguages.includes(language) ? language : 'en'

      const languageNames: Record<string, string> = {
        'en': 'English',
        'fi': 'Finnish',
        'sv': 'Swedish',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'et': 'Estonian',
        'no': 'Norwegian',
        'da': 'Danish',
        'nl': 'Dutch'
      }

      // Create student with RLS automatically filtering by user_id
      const { data: student, error } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          name: name.trim(),
          grade: grade,
          language: studentLanguage,
          language_name: languageNames[studentLanguage]
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating student:', error)
        return NextResponse.json(
          { error: 'Failed to create student' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Student created successfully',
        student
      }, { status: 201 })

    } catch (error) {
      console.error('Students POST error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}