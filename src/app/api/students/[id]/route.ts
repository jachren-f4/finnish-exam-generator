import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// PUT /api/students/[id] - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id } = await params
      const body = await req.json()
      const { name, grade } = body

      // Validate input
      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        return NextResponse.json(
          { error: 'Student name cannot be empty' },
          { status: 400 }
        )
      }

      if (grade !== undefined && (typeof grade !== 'number' || grade < 1 || grade > 9)) {
        return NextResponse.json(
          { error: 'Grade must be between 1 and 9' },
          { status: 400 }
        )
      }

      // Prepare update data
      const updateData: any = {}
      if (name !== undefined) updateData.name = name.trim()
      if (grade !== undefined) updateData.grade = grade

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        )
      }

      // Update student (RLS ensures user can only update their own students)
      const { data: student, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Extra security check
        .select()
        .single()

      if (error) {
        console.error('Error updating student:', error)
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Student not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: 'Failed to update student' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Student updated successfully',
        student
      })

    } catch (error) {
      console.error('Student PUT error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/students/[id] - Delete student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id } = await params

      // Check if student has any exams
      const { data: exams, error: examError } = await supabase
        .from('examgenie_exams')
        .select('id')
        .eq('student_id', id)
        .eq('user_id', user.id) // Extra security check
        .limit(1)

      if (examError) {
        console.error('Error checking student exams:', examError)
        return NextResponse.json(
          { error: 'Failed to check student exams' },
          { status: 500 }
        )
      }

      if (exams && exams.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete student with existing exams' },
          { status: 400 }
        )
      }

      // Delete student (RLS ensures user can only delete their own students)
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id) // Extra security check

      if (error) {
        console.error('Error deleting student:', error)
        return NextResponse.json(
          { error: 'Failed to delete student' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Student deleted successfully'
      })

    } catch (error) {
      console.error('Student DELETE error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// GET /api/students/[id] - Get specific student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id } = await params

      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Extra security check
        .single()

      if (error) {
        console.error('Error fetching student:', error)
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Student not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: 'Failed to fetch student' },
          { status: 500 }
        )
      }

      return NextResponse.json({ student })

    } catch (error) {
      console.error('Student GET error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}