import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { MobileApiService } from '@/lib/services/mobile-api-service'
import { v4 as uuidv4 } from 'uuid'

// POST /api/exams/[id]/process - Process exam images and generate questions
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

      if (exam.status !== 'DRAFT') {
        return NextResponse.json(
          { error: `Exam is already ${exam.status.toLowerCase()}. Only draft exams can be processed.` },
          { status: 400 }
        )
      }

      // Update status to PROCESSING
      const { error: statusError } = await supabase
        .from('examgenie_exams')
        .update({ status: 'PROCESSING' })
        .eq('id', examId)

      if (statusError) {
        console.error('Error updating exam status:', statusError)
        return NextResponse.json(
          { error: 'Failed to start processing' },
          { status: 500 }
        )
      }

      // Get image files from form data
      const formData = await req.formData()
      const imageFiles: File[] = []

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && value instanceof File) {
          imageFiles.push(value)
        }
      }

      if (imageFiles.length === 0) {
        // Restore status to DRAFT
        await supabase
          .from('examgenie_exams')
          .update({ status: 'DRAFT' })
          .eq('id', examId)

        return NextResponse.json(
          { error: 'No images provided for processing' },
          { status: 400 }
        )
      }

      // Start background processing
      processExamAsync(examId, imageFiles, exam, supabase)

      return NextResponse.json({
        exam_id: examId,
        status: 'PROCESSING',
        message: 'Exam processing started. Use /api/exams/:id/progress to track progress.',
        image_count: imageFiles.length
      })

    } catch (error) {
      console.error('Exam processing error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Background processing function
async function processExamAsync(
  examId: string,
  imageFiles: File[],
  exam: any,
  supabase: any
) {
  try {
    console.log(`Starting background processing for exam ${examId}`)

    // Use MobileApiService to process the exam
    const result = await MobileApiService.generateExam({
      images: imageFiles,
      processingId: uuidv4(),
      subject: exam.subject,
      grade: parseInt(exam.grade, 10),
      user_id: exam.user_id
    })

    if (result.success && result.data) {
      // Extract questions from the result
      const questions = (result.data as any).questions || []

      // Update exam with results
      const { error: updateError } = await supabase
        .from('examgenie_exams')
        .update({
          status: 'READY',
          processed_text: (result.data as any).rawText || null,
          raw_ai_response: JSON.stringify(result.data),
          final_questions: questions,
          creation_gemini_usage: result.data.metadata?.geminiUsage || null,
          completed_at: new Date().toISOString(),
          diagnostic_enabled: result.data.metadata?.diagnostic?.enabled || false,
          ocr_raw_text: result.data.metadata?.diagnostic?.rawOcrPreview || null
        })
        .eq('id', examId)

      if (updateError) {
        console.error('Error updating exam with results:', updateError)
        // Mark as failed
        await supabase
          .from('examgenie_exams')
          .update({ status: 'FAILED' })
          .eq('id', examId)
      } else {
        // Insert individual questions into the questions table
        if (questions && questions.length > 0) {
          const questionInserts = questions.map((q: any, index: number) => ({
            exam_id: examId,
            question_number: index + 1,
            question_text: q.question || q.question_text,
            question_type: q.type || q.question_type || 'multiple_choice',
            options: q.options || null,
            correct_answer: q.correct_answer || null,
            explanation: q.explanation || null,
            max_points: 2,
            is_selected: true // All questions are selected by default
          }))

          const { error: questionsError } = await supabase
            .from('examgenie_questions')
            .insert(questionInserts)

          if (questionsError) {
            console.error('Error inserting questions:', questionsError)
            // Don't fail the entire exam for this
          } else {
            console.log(`Inserted ${questions.length} questions for exam ${examId}`)
          }
        }

        console.log(`Exam ${examId} processed successfully`)
      }
    } else {
      console.error(`Exam processing failed for ${examId}:`, result.error)

      // Update exam as failed
      await supabase
        .from('examgenie_exams')
        .update({
          status: 'FAILED',
          raw_ai_response: JSON.stringify({ error: result.error, details: result.details })
        })
        .eq('id', examId)
    }

  } catch (error) {
    console.error(`Background processing error for exam ${examId}:`, error)

    // Update exam as failed
    await supabase
      .from('examgenie_exams')
      .update({
        status: 'FAILED',
        raw_ai_response: JSON.stringify({
          error: 'Processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      })
      .eq('id', examId)
  }
}