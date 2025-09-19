import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/middleware/auth'
import { ExamRepository } from '@/lib/services/exam-repository'
import { ExamGradingService } from '@/lib/services/exam-grading-service'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/feedback/[examId] - Get detailed learning feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  return withOptionalAuth(request, async (req, _authContext) => {
    try {
      const resolvedParams = await params
      const { examId } = resolvedParams
      const studentLanguage = req.nextUrl.searchParams.get('language') || 'en'

      // Get exam from database
      const exam = await ExamRepository.findById(examId)
      if (!exam) {
        return NextResponse.json(
          { error: 'Exam not found' },
          { status: 404 }
        )
      }

      // Check if feedback already exists
      const { data: existingFeedback, error: feedbackError } = await supabaseAdmin!
        .from('learning_feedback')
        .select('*')
        .eq('exam_id', examId)
        .eq('feedback_language', studentLanguage)
        .single()

      if (existingFeedback && !feedbackError) {
        return NextResponse.json({
          examId,
          language: studentLanguage,
          feedbackText: existingFeedback.feedback_text,
          createdAt: existingFeedback.created_at,
          cached: true
        })
      }

      // Generate new feedback
      const gradingResult = await ExamRepository.getGradingResult(examId)
      if (!gradingResult) {
        return NextResponse.json(
          { error: 'No grading results found for this exam' },
          { status: 404 }
        )
      }

      const feedbackText = await ExamGradingService.generatePersonalizedFeedback(
        gradingResult,
        studentLanguage,
        exam.ocr_raw_text
      )

      if (!feedbackText) {
        return NextResponse.json(
          { error: 'Failed to generate feedback' },
          { status: 500 }
        )
      }

      // Cache the feedback for future use
      await supabaseAdmin!
        .from('learning_feedback')
        .insert({
          exam_id: examId,
          student_id: (exam as any).student_id || null,
          feedback_text: feedbackText,
          feedback_language: studentLanguage
        })

      return NextResponse.json({
        examId,
        language: studentLanguage,
        feedbackText,
        createdAt: new Date().toISOString(),
        cached: false
      })

    } catch (error) {
      console.error('Error getting feedback:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}