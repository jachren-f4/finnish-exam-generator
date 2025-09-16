import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { FINNISH_SUBJECTS, FinnishSubject } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// POST /api/exams/create - Create new exam with ExamGenie workflow
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const formData = await req.formData()

      // Extract parameters
      const subject = formData.get('subject')?.toString() as FinnishSubject
      const gradeStr = formData.get('grade')?.toString()
      const student_id = formData.get('student_id')?.toString()

      // Get image files
      const imageFiles: File[] = []
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && value instanceof File) {
          imageFiles.push(value)
        }
      }

      // Validation
      if (!subject || !FINNISH_SUBJECTS.includes(subject)) {
        return NextResponse.json(
          { error: 'Valid subject is required', validSubjects: FINNISH_SUBJECTS },
          { status: 400 }
        )
      }

      if (!gradeStr) {
        return NextResponse.json(
          { error: 'Grade is required' },
          { status: 400 }
        )
      }

      const grade = parseInt(gradeStr, 10)
      if (isNaN(grade) || grade < 1 || grade > 9) {
        return NextResponse.json(
          { error: 'Grade must be between 1 and 9' },
          { status: 400 }
        )
      }

      if (imageFiles.length === 0) {
        return NextResponse.json(
          { error: 'At least one image is required' },
          { status: 400 }
        )
      }

      if (imageFiles.length > 10) {
        return NextResponse.json(
          { error: 'Maximum 10 images allowed' },
          { status: 400 }
        )
      }

      // Validate student ownership if student_id provided
      if (student_id) {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('id', student_id)
          .eq('user_id', user.id)
          .single()

        if (studentError || !student) {
          return NextResponse.json(
            { error: 'Student not found or access denied' },
            { status: 404 }
          )
        }
      }

      // Create exam record in DRAFT status
      const examId = uuidv4()
      const shareId = uuidv4().substring(0, 8)

      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .insert({
          id: examId,
          user_id: user.id,
          student_id: student_id || null,
          subject,
          grade: gradeStr,
          status: 'DRAFT',
          share_id: shareId,
          diagnostic_enabled: false
        })
        .select()
        .single()

      if (examError) {
        console.error('Error creating exam:', examError)
        return NextResponse.json(
          { error: 'Failed to create exam' },
          { status: 500 }
        )
      }

      // Return exam info for client to start processing
      return NextResponse.json({
        exam_id: examId,
        status: 'DRAFT',
        subject,
        grade,
        share_id: shareId,
        message: 'Exam created successfully. Use /api/exams/:id/process to start processing.',
        created_at: exam.created_at
      }, { status: 201 })

    } catch (error) {
      console.error('Exam creation error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}