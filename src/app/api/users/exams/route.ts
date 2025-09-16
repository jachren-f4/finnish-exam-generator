import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// GET /api/users/exams - Get user's exams with filtering and pagination
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const url = new URL(req.url)
      const searchParams = url.searchParams

      // Extract query parameters
      const student_id = searchParams.get('student_id')
      const subject = searchParams.get('subject')
      const status = searchParams.get('status')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
      const offset = parseInt(searchParams.get('offset') || '0', 10)

      // Build query
      let query = supabase
        .from('examgenie_exams')
        .select(`
          id,
          subject,
          grade,
          status,
          created_at,
          updated_at,
          completed_at,
          share_id,
          sharing_url,
          students!examgenie_exams_student_id_fkey (
            id,
            name,
            grade
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (student_id) {
        query = query.eq('student_id', student_id)
      }

      if (subject) {
        query = query.eq('subject', subject)
      }

      if (status) {
        query = query.eq('status', status.toUpperCase())
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: exams, error: examsError } = await query

      if (examsError) {
        console.error('Error fetching exams:', examsError)
        return NextResponse.json(
          { error: 'Failed to fetch exams' },
          { status: 500 }
        )
      }

      // Get question counts for ready exams
      const examIds = exams?.filter((exam: any) => exam.status === 'READY').map((exam: any) => exam.id) || []
      let questionCounts: Record<string, number> = {}

      if (examIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('examgenie_questions')
          .select('exam_id')
          .in('exam_id', examIds)

        if (!questionsError && questions) {
          questionCounts = questions.reduce((acc: any, q: any) => {
            acc[q.exam_id] = (acc[q.exam_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      }

      // Get total count for pagination
      let totalQuery = supabase
        .from('examgenie_exams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (student_id) totalQuery = totalQuery.eq('student_id', student_id)
      if (subject) totalQuery = totalQuery.eq('subject', subject)
      if (status) totalQuery = totalQuery.eq('status', status.toUpperCase())

      const { count: totalCount, error: countError } = await totalQuery

      if (countError) {
        console.error('Error counting exams:', countError)
        // Continue without total count
      }

      // Format response
      const formattedExams = exams?.map((exam: any) => ({
        id: exam.id,
        subject: exam.subject,
        grade: exam.grade,
        status: exam.status,
        created_at: exam.created_at,
        updated_at: exam.updated_at,
        completed_at: exam.completed_at,
        share_id: exam.share_id,
        sharing_url: exam.sharing_url,
        student: exam.students,
        question_count: questionCounts[exam.id] || 0
      })) || []

      return NextResponse.json({
        exams: formattedExams,
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          has_more: (totalCount || 0) > offset + limit
        },
        filters: {
          student_id,
          subject,
          status
        }
      })

    } catch (error) {
      console.error('User exams list error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}