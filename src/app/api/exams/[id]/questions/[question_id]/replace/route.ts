import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// PUT /api/exams/[id]/questions/[question_id]/replace - Replace question with selected replacement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; question_id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId, question_id } = await params
      const body = await req.json()
      const {
        question_text,
        question_type,
        options,
        correct_answer,
        explanation
      } = body

      if (!question_text) {
        return NextResponse.json(
          { error: 'question_text is required' },
          { status: 400 }
        )
      }

      // Verify exam ownership
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select('id, status')
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
          { error: 'Questions can only be replaced for ready exams' },
          { status: 400 }
        )
      }

      // Verify question exists and belongs to this exam
      const { data: originalQuestion, error: questionError } = await supabase
        .from('examgenie_questions')
        .select('*')
        .eq('id', question_id)
        .eq('exam_id', examId)
        .single()

      if (questionError || !originalQuestion) {
        return NextResponse.json(
          { error: 'Question not found' },
          { status: 404 }
        )
      }

      // Update the question with new content
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('examgenie_questions')
        .update({
          question_text,
          question_type: question_type || originalQuestion.question_type,
          options: options || originalQuestion.options,
          correct_answer: correct_answer || originalQuestion.correct_answer,
          explanation: explanation || originalQuestion.explanation
        })
        .eq('id', question_id)
        .eq('exam_id', examId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating question:', updateError)
        return NextResponse.json(
          { error: 'Failed to update question' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Question replaced successfully',
        question: updatedQuestion,
        original_question_text: originalQuestion.question_text
      })

    } catch (error) {
      console.error('Question update error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}