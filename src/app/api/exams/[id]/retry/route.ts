import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// POST /api/exams/[id]/retry - Retry failed exam processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params

      // Get exam and verify ownership
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select('*')
        .eq('id', examId)
        .eq('user_id', user.id)
        .single()

      if (examError || !exam) {
        return NextResponse.json(
          { error: 'Exam not found or access denied' },
          { status: 404 }
        )
      }

      // Only allow retry for failed exams
      if (exam.status !== 'FAILED') {
        return NextResponse.json(
          { error: `Cannot retry exam with status: ${exam.status}. Only failed exams can be retried.` },
          { status: 400 }
        )
      }

      // Check if original images are available
      if (!exam.original_images) {
        return NextResponse.json(
          { error: 'Original images not found. Cannot retry processing.' },
          { status: 400 }
        )
      }

      // Reset exam status to DRAFT
      const { error: resetError } = await supabase
        .from('examgenie_exams')
        .update({
          status: 'DRAFT',
          processed_text: null,
          raw_ai_response: null,
          final_questions: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)

      if (resetError) {
        console.error('Error resetting exam status:', resetError)
        return NextResponse.json(
          { error: 'Failed to reset exam for retry' },
          { status: 500 }
        )
      }

      // Delete any existing questions from the failed attempt
      const { error: deleteQuestionsError } = await supabase
        .from('examgenie_questions')
        .delete()
        .eq('exam_id', examId)

      if (deleteQuestionsError) {
        console.error('Error deleting questions for retry:', deleteQuestionsError)
        // Continue anyway - this is not critical
      }

      return NextResponse.json({
        exam_id: examId,
        status: 'DRAFT',
        message: 'Exam reset for retry. Use /api/exams/:id/process to start processing again.',
        reset_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Exam retry error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}