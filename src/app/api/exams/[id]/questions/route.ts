import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// GET /api/exams/[id]/questions - Get all questions for exam
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params
      const url = new URL(req.url)
      const includeUnselected = url.searchParams.get('include_unselected') === 'true'

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
          { error: 'Questions are only available for ready exams' },
          { status: 400 }
        )
      }

      // Get questions
      let query = supabase
        .from('examgenie_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number')

      // Filter by selection status if not including unselected
      if (!includeUnselected) {
        query = query.eq('is_selected', true)
      }

      const { data: questions, error: questionsError } = await query

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
        return NextResponse.json(
          { error: 'Failed to fetch questions' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        exam_id: examId,
        subject: exam.subject,
        grade: exam.grade,
        questions: questions || [],
        total_count: questions?.length || 0,
        selected_count: questions?.filter((q: any) => q.is_selected).length || 0
      })

    } catch (error) {
      console.error('Questions fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}