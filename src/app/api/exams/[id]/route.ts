import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// GET /api/exams/[id] - Get exam details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params

      // Get exam and verify ownership
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select(`
          *,
          students!examgenie_exams_student_id_fkey (
            id,
            name,
            grade
          )
        `)
        .eq('id', examId)
        .eq('user_id', user.id)
        .single()

      if (examError || !exam) {
        return NextResponse.json(
          { error: 'Exam not found or access denied' },
          { status: 404 }
        )
      }

      // Get questions if exam is ready
      let questions = null
      if (exam.status === 'READY') {
        const { data: questionsData, error: questionsError } = await supabase
          .from('examgenie_questions')
          .select('*')
          .eq('exam_id', examId)
          .order('question_number')

        if (!questionsError) {
          questions = questionsData
        }
      }

      return NextResponse.json({
        exam: {
          id: exam.id,
          subject: exam.subject,
          grade: exam.grade,
          status: exam.status,
          created_at: exam.created_at,
          updated_at: exam.updated_at,
          completed_at: exam.completed_at,
          sharing_url: exam.sharing_url,
          share_id: exam.share_id,
          diagnostic_enabled: exam.diagnostic_enabled,
          creation_gemini_usage: exam.creation_gemini_usage,
          student: exam.students || null
        },
        questions: questions,
        question_count: questions ? questions.length : 0
      })

    } catch (error) {
      console.error('Exam details error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/exams/[id] - Delete exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params

      // Verify ownership before deletion
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select('id')
        .eq('id', examId)
        .eq('user_id', user.id)
        .single()

      if (examError || !exam) {
        return NextResponse.json(
          { error: 'Exam not found or access denied' },
          { status: 404 }
        )
      }

      // Delete exam (questions will be deleted automatically via CASCADE)
      const { error: deleteError } = await supabase
        .from('examgenie_exams')
        .delete()
        .eq('id', examId)
        .eq('user_id', user.id) // Extra security check

      if (deleteError) {
        console.error('Error deleting exam:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete exam' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Exam deleted successfully'
      })

    } catch (error) {
      console.error('Exam deletion error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}