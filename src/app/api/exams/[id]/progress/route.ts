import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// GET /api/exams/[id]/progress - Get exam processing progress
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
          id,
          status,
          subject,
          grade,
          created_at,
          updated_at,
          completed_at,
          diagnostic_enabled,
          creation_gemini_usage
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

      // Calculate progress based on status
      let progress = 0
      let progressMessage = ''

      switch (exam.status) {
        case 'DRAFT':
          progress = 0
          progressMessage = 'Koe on luotu, odottaa käsittelyä'
          break
        case 'PROCESSING':
          progress = 50
          progressMessage = 'Käsitellään kuvia ja luodaan kysymyksiä...'
          break
        case 'READY':
          progress = 100
          progressMessage = 'Koe on valmis!'
          break
        case 'FAILED':
          progress = 0
          progressMessage = 'Käsittely epäonnistui'
          break
        default:
          progress = 0
          progressMessage = 'Tuntematon tila'
      }

      // Calculate processing time if completed
      let processingTime: number | null = null
      if (exam.completed_at && exam.created_at) {
        const createdAt = new Date(exam.created_at)
        const completedAt = new Date(exam.completed_at)
        processingTime = completedAt.getTime() - createdAt.getTime()
      }

      // Get question count if ready
      let questionCount: number | null = null
      if (exam.status === 'READY') {
        const { data: questions, error: questionError } = await supabase
          .from('examgenie_questions')
          .select('id')
          .eq('exam_id', examId)

        if (!questionError) {
          questionCount = questions.length
        }
      }

      return NextResponse.json({
        exam_id: examId,
        status: exam.status,
        progress,
        progress_message: progressMessage,
        subject: exam.subject,
        grade: exam.grade,
        created_at: exam.created_at,
        updated_at: exam.updated_at,
        completed_at: exam.completed_at,
        processing_time_ms: processingTime,
        question_count: questionCount,
        diagnostic_enabled: exam.diagnostic_enabled,
        gemini_usage: exam.creation_gemini_usage
      })

    } catch (error) {
      console.error('Progress tracking error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}