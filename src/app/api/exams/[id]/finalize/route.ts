import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// PUT /api/exams/[id]/finalize - Mark exam as final with selected questions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params
      const body = await req.json()
      const { selected_question_ids, create_sharing_url = false } = body

      if (!selected_question_ids || !Array.isArray(selected_question_ids)) {
        return NextResponse.json(
          { error: 'selected_question_ids array is required' },
          { status: 400 }
        )
      }

      if (selected_question_ids.length === 0) {
        return NextResponse.json(
          { error: 'At least one question must be selected' },
          { status: 400 }
        )
      }

      if (selected_question_ids.length > 20) {
        return NextResponse.json(
          { error: 'Maximum 20 questions can be selected' },
          { status: 400 }
        )
      }

      // Verify exam ownership
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select('id, status, subject, grade')
        .eq('id', examId)
        .eq('user_id', user.id)
        .single()

      if (examError || !exam) {
        return NextResponse.json(
          { error: 'Exam not found or access denied' },
          { status: 404 }
        )
      }

      if (exam.status !== 'READY') {
        return NextResponse.json(
          { error: 'Only ready exams can be finalized' },
          { status: 400 }
        )
      }

      // Verify all selected questions belong to this exam
      const { data: questions, error: questionsError } = await supabase
        .from('examgenie_questions')
        .select('id')
        .eq('exam_id', examId)
        .in('id', selected_question_ids)

      if (questionsError) {
        console.error('Error verifying questions:', questionsError)
        return NextResponse.json(
          { error: 'Failed to verify questions' },
          { status: 500 }
        )
      }

      if (questions.length !== selected_question_ids.length) {
        return NextResponse.json(
          { error: 'Some selected questions do not belong to this exam' },
          { status: 400 }
        )
      }

      // Update all questions' selection status
      // First, mark all questions as unselected
      const { error: unselectAllError } = await supabase
        .from('examgenie_questions')
        .update({ is_selected: false })
        .eq('exam_id', examId)

      if (unselectAllError) {
        console.error('Error unselecting questions:', unselectAllError)
        return NextResponse.json(
          { error: 'Failed to update question selection' },
          { status: 500 }
        )
      }

      // Then, mark selected questions as selected
      const { error: selectError } = await supabase
        .from('examgenie_questions')
        .update({ is_selected: true })
        .eq('exam_id', examId)
        .in('id', selected_question_ids)

      if (selectError) {
        console.error('Error selecting questions:', selectError)
        return NextResponse.json(
          { error: 'Failed to update question selection' },
          { status: 500 }
        )
      }

      // Optionally create sharing URL
      let sharingUrl = null
      if (create_sharing_url) {
        sharingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/exam/${exam.share_id || 'unknown'}`

        const { error: sharingError } = await supabase
          .from('examgenie_exams')
          .update({ sharing_url: sharingUrl })
          .eq('id', examId)

        if (sharingError) {
          console.error('Error creating sharing URL:', sharingError)
          // Continue without sharing URL
          sharingUrl = null
        }
      }

      // Get the final selected questions for response
      const { data: finalQuestions, error: finalQuestionsError } = await supabase
        .from('examgenie_questions')
        .select('*')
        .eq('exam_id', examId)
        .eq('is_selected', true)
        .order('question_number')

      if (finalQuestionsError) {
        console.error('Error fetching final questions:', finalQuestionsError)
        return NextResponse.json(
          { error: 'Exam finalized but failed to fetch final questions' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Exam finalized successfully',
        exam_id: examId,
        selected_questions_count: selected_question_ids.length,
        sharing_url: sharingUrl,
        final_questions: finalQuestions
      })

    } catch (error) {
      console.error('Exam finalization error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}