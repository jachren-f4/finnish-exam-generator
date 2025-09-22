import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { QuestionGeneratorService } from '@/lib/services/question-generator-service'
import { PROMPTS } from '@/lib/config'

// POST /api/exams/[id]/questions/replace - Replace specific question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params
      const body = await req.json()
      const { question_id, replacement_count = 3 } = body

      if (!question_id) {
        return NextResponse.json(
          { error: 'question_id is required' },
          { status: 400 }
        )
      }

      if (replacement_count < 1 || replacement_count > 10) {
        return NextResponse.json(
          { error: 'replacement_count must be between 1 and 10' },
          { status: 400 }
        )
      }

      // Verify exam ownership and get exam details
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select('id, status, subject, grade, processed_text, user_id')
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

      if (!exam.processed_text) {
        return NextResponse.json(
          { error: 'Original text not available for question generation' },
          { status: 400 }
        )
      }

      // Generate replacement questions using the category-aware prompt
      const prompt = PROMPTS.getCategoryAwarePrompt(
        'core_academics',
        parseInt(exam.grade, 10),
        'fi'
      ) + `\n\nLuo ${replacement_count} korvaavaa kysymystä tähän tehtävään (kysymys numero ${originalQuestion.question_number}). Keskity samaan aihealueeseen mutta tee kysymykset hieman erilaisilta.`

      try {
        console.log(`Generating ${replacement_count} replacement questions for question ${question_id}`)

        // Use Gemini directly for question replacement
        const { GoogleGenerativeAI } = require('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Parse JSON response
        const parsedResult = JSON.parse(text)
        const replacementQuestions = parsedResult.questions || []

        if (!replacementQuestions || replacementQuestions.length === 0) {
          return NextResponse.json(
            { error: 'Failed to generate replacement questions' },
            { status: 500 }
          )
        }

        // Format replacement questions with proper structure
        const formattedReplacements = replacementQuestions.map((q: any, index: number) => ({
          id: `replacement_${originalQuestion.id}_${index + 1}`,
          question_text: q.question || q.question_text,
          question_type: q.type || q.question_type || 'multiple_choice',
          options: q.options || null,
          correct_answer: q.correct_answer || null,
          explanation: q.explanation || null,
          max_points: originalQuestion.max_points,
          is_replacement: true,
          original_question_id: question_id
        }))

        return NextResponse.json({
          exam_id: examId,
          original_question: {
            id: originalQuestion.id,
            question_text: originalQuestion.question_text,
            question_number: originalQuestion.question_number
          },
          replacement_questions: formattedReplacements,
          replacement_count: formattedReplacements.length
        })

      } catch (generationError) {
        console.error('Question replacement generation error:', generationError)
        return NextResponse.json(
          { error: 'Failed to generate replacement questions' },
          { status: 500 }
        )
      }

    } catch (error) {
      console.error('Question replacement error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}