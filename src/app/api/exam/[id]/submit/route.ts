import { NextRequest } from 'next/server'
import { submitAnswers, getNextAttemptNumber } from '@/lib/exam-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorContext = {
    endpoint: '/api/exam/[id]/submit',
    method: 'POST'
  }

  try {
    const resolvedParams = await params
    const examId = resolvedParams.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(examId)) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Invalid exam ID format',
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'Virheellinen kokeen tunniste',
        'Kokeen tunniste ei ole oikeassa muodossa'
      )
    }

    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Invalid answers format',
        { ...errorContext, additionalData: { examId } }
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'Virheelliset vastaukset',
        'Vastaukset täytyy antaa taulukkomuodossa'
      )
    }

    // Validate answers format
    for (const answer of answers) {
      if (!answer.question_id || typeof answer.answer_text !== 'string') {
        const managedError = ErrorManager.createFromPattern(
          'INVALID_REQUEST',
          'Invalid answer structure',
          { ...errorContext, additionalData: { examId } }
        )
        ErrorManager.logError(managedError)
        return ApiResponseBuilder.validationError(
          'Virheellinen vastaus',
          'Jokainen vastaus tarvitsee question_id ja answer_text kentät'
        )
      }
    }

    // Get the next attempt number for this exam
    const attemptNumber = await getNextAttemptNumber(examId)
    console.log(`Processing attempt #${attemptNumber} for exam ${examId}`)

    const gradingResult = await submitAnswers(examId, answers, attemptNumber)
    
    if (!gradingResult) {
      const managedError = ErrorManager.createFromError(
        new Error('Exam submission failed'),
        { ...errorContext, additionalData: { examId } },
        ErrorCategory.VALIDATION
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.error(
        'Vastausten lähettäminen epäonnistui',
        'Koe ei ole saatavilla tai sitä on jo arvosteltu',
        { status: 409 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://examgenie.app'

    return ApiResponseBuilder.success({
      success: true,
      message: 'Vastaukset lähetetty ja arvosteltu onnistuneesti',
      exam_id: examId,
      status: 'graded',
      final_grade: gradingResult.final_grade,
      total_points: gradingResult.total_points,
      max_total_points: gradingResult.max_total_points,
      grading_url: `${baseUrl}/grading/${examId}`
    })

  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      'Palvelinvirhe',
      'Vastausten lähettäminen epäonnistui'
    )
  }
}

// Handle CORS for exam submission
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type'],
    '*'
  )
}