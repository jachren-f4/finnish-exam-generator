import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/shared/exam/[share_id] - Public exam access (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ share_id: string }> }
) {
  try {
    const { share_id } = await params

    if (!share_id) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      )
    }

    // Find exam by share_id
    const { data: exam, error: examError } = await supabase
      .from('examgenie_exams')
      .select(`
        id,
        subject,
        grade,
        status,
        created_at,
        completed_at,
        sharing_url,
        share_id,
        students!examgenie_exams_student_id_fkey (
          name,
          grade
        )
      `)
      .eq('share_id', share_id)
      .not('sharing_url', 'is', null) // Only return exams that have been explicitly shared
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Shared exam not found or not available for sharing' },
        { status: 404 }
      )
    }

    if (exam.status !== 'READY') {
      return NextResponse.json(
        { error: 'Exam is not ready for viewing' },
        { status: 400 }
      )
    }

    // Get selected questions for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('examgenie_questions')
      .select(`
        id,
        question_number,
        question_text,
        question_type,
        options,
        max_points
      `)
      .eq('exam_id', exam.id)
      .eq('is_selected', true)
      .order('question_number')

    if (questionsError) {
      console.error('Error fetching shared exam questions:', questionsError)
      return NextResponse.json(
        { error: 'Failed to load exam questions' },
        { status: 500 }
      )
    }

    // Format response for public viewing (no sensitive data)
    const sharedExam = {
      id: exam.id,
      subject: exam.subject,
      grade: exam.grade,
      created_at: exam.created_at,
      completed_at: exam.completed_at,
      share_id: exam.share_id,
      student_name: exam.students ? (exam.students as any).name : null,
      student_grade: exam.students ? (exam.students as any).grade : null,
      questions: questions?.map(q => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        max_points: q.max_points
      })) || [],
      question_count: questions?.length || 0,
      total_points: questions?.reduce((sum, q) => sum + (q.max_points || 2), 0) || 0
    }

    return NextResponse.json({
      exam: sharedExam,
      shared: true,
      access_type: 'public'
    })

  } catch (error) {
    console.error('Shared exam access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}