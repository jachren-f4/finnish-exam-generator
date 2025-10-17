import { supabase, supabaseAdmin, ExamData, StudentAnswer, GradingResult } from './supabase'
import { ExamCreator, ExamCreationOptions } from './services/exam-creator'
import { ExamRepository } from './services/exam-repository'
import { ExamGradingService } from './services/exam-grading-service'
import { getGradingPrompt } from './config'
import { DatabaseManager } from './utils/database-manager'


// Create a new exam from Gemini response - using new ExamCreator service
export async function createExam(
  geminiResponse: string, 
  promptUsed?: string,
  diagnosticData?: {
    imageUrls: string[]
    rawOcrText: string
    diagnosticEnabled: boolean
  },
  geminiUsage?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
): Promise<{ examId: string; examUrl: string; gradingUrl: string } | null> {
  const options: ExamCreationOptions = {
    promptUsed,
    diagnosticData,
    geminiUsage
  }
  
  return ExamCreator.createFromGeminiResponse(geminiResponse, options)
}

// Get exam data for taking (without answers) - using new ExamRepository
export async function getExamForTaking(examId: string): Promise<ExamData | null> {
  return ExamRepository.findForTaking(examId)
}

// Get next attempt number for an exam
export async function getNextAttemptNumber(examId: string): Promise<number> {
  try {
    // Try ExamGenie grading table first
    let gradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('examgenie_grading')
          .select('attempt_number')
          .eq('exam_id', examId)
          .order('attempt_number', { ascending: false })
          .limit(1)
      },
      'Get Latest ExamGenie Attempt Number'
    )

    // Fall back to legacy grading table if not found
    if (gradingResult.error || !gradingResult.data || gradingResult.data.length === 0) {
      gradingResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabase
            .from('grading')
            .select('attempt_number')
            .eq('exam_id', examId)
            .order('attempt_number', { ascending: false })
            .limit(1)
        },
        'Get Latest Legacy Attempt Number'
      )
    }

    if (gradingResult.error || !gradingResult.data || gradingResult.data.length === 0) {
      return 1 // First attempt
    }

    const latestAttempt = gradingResult.data[0].attempt_number || 1
    return latestAttempt + 1
  } catch (error) {
    console.error('Error getting next attempt number:', error)
    return 1
  }
}

// Get IDs of questions that were answered incorrectly in the latest attempt
export async function getWrongQuestionIds(examId: string): Promise<string[]> {
  try {
    // Try ExamGenie grading table first
    let gradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('examgenie_grading')
          .select('grading_json')
          .eq('exam_id', examId)
          .order('attempt_number', { ascending: false })
          .limit(1)
      },
      'Get Latest ExamGenie Grading for Wrong Questions'
    )

    // Fall back to legacy grading table if not found
    if (gradingResult.error || !gradingResult.data || gradingResult.data.length === 0) {
      gradingResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabase
            .from('grading')
            .select('grading_json')
            .eq('exam_id', examId)
            .order('attempt_number', { ascending: false })
            .limit(1)
        },
        'Get Latest Legacy Grading for Wrong Questions'
      )
    }

    if (gradingResult.error || !gradingResult.data || gradingResult.data.length === 0) {
      return []
    }

    const grading = gradingResult.data[0].grading_json
    if (!grading || !grading.questions) {
      return []
    }

    // Filter questions where points_awarded < max_points
    const wrongQuestionIds = grading.questions
      .filter((q: any) => q.points_awarded < q.max_points)
      .map((q: any) => q.id)

    console.log(`Found ${wrongQuestionIds.length} wrong questions for exam ${examId}`)
    return wrongQuestionIds
  } catch (error) {
    console.error('Error getting wrong question IDs:', error)
    return []
  }
}

// Get exam state for reuse/review - checks if exam has been completed at least once
export async function getExamState(examId: string): Promise<{
  exam: ExamData | null,
  hasBeenCompleted: boolean,
  latestGrading: any | null,
  canReuse: boolean
} | null> {
  try {
    // Get exam data
    const exam = await ExamRepository.findById(examId)
    if (!exam) {
      return null
    }

    // Check if exam has been completed (has grading data)
    // Try ExamGenie grading table first
    let gradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('examgenie_grading')
          .select('*')
          .eq('exam_id', examId)
          .order('attempt_number', { ascending: false })
          .limit(1)
      },
      'Get Latest ExamGenie Grading'
    )

    // Fall back to legacy grading table if not found
    if (gradingResult.error || !gradingResult.data || gradingResult.data.length === 0) {
      gradingResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabase
            .from('grading')
            .select('*')
            .eq('exam_id', examId)
            .order('attempt_number', { ascending: false })
            .limit(1)
        },
        'Get Latest Legacy Grading'
      )
    }

    const hasBeenCompleted = !gradingResult.error && !!gradingResult.data && gradingResult.data.length > 0
    const latestGrading = hasBeenCompleted && gradingResult.data ? gradingResult.data[0] : null

    // Use repository method to get exam for taking (properly formatted)
    const examData = await ExamRepository.findForTaking(examId)
    if (!examData) {
      return null
    }

    return {
      exam: examData,
      hasBeenCompleted,
      latestGrading,
      canReuse: hasBeenCompleted // Only allow reuse if completed at least once
    }

  } catch (error) {
    console.error('Error getting exam state:', error)
    return null
  }
}

// Submit student answers and trigger grading
export async function submitAnswers(examId: string, answers: StudentAnswer[], attemptNumber?: number): Promise<GradingResult | null> {
  try {
    console.log(`[submitAnswers] Starting for exam ${examId}, answers count: ${answers.length}`)

    // First, try to get the original exam from legacy table
    let exam = null
    let examgenieResult = null
    const legacyExamResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('exams')
          .select('*')
          .eq('exam_id', examId)
          .eq('status', 'created')
          .maybeSingle()
      },
      'Get Legacy Exam for Submission'
    )

    if (!legacyExamResult.error && legacyExamResult.data) {
      exam = legacyExamResult.data
    } else {
      // If not found in legacy table, try ExamGenie table
      console.log(`[submitAnswers] Legacy exam not found, trying ExamGenie. supabaseAdmin available: ${!!supabaseAdmin}`)
      if (!supabaseAdmin) {
        console.error('[submitAnswers] FAILED: supabaseAdmin not available for ExamGenie exam submission')
        return null
      }

      examgenieResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabaseAdmin!
            .from('examgenie_exams')
            .select('*')
            .eq('id', examId)
            .maybeSingle()
        },
        'Get ExamGenie Exam for Submission'
      )

      // Check if exam exists and has valid status
      if (examgenieResult.data) {
        const status = (examgenieResult.data as any).status
        if (status !== 'READY' && status !== 'created') {
          console.log(`Exam ${examId} has invalid status for submission: ${status}`)
          return null
        }
      }

      if (examgenieResult.error || !examgenieResult.data) {
        console.log('Exam not found in either table:', examId)
        return null
      }

      // Get questions for ExamGenie exam
      const questionsResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabaseAdmin!
            .from('examgenie_questions')
            .select('*')
            .eq('exam_id', examId)
            .order('question_number', { ascending: true })
        },
        'Get ExamGenie Questions for Submission'
      )

      if (questionsResult.error || !questionsResult.data) {
        console.log('Questions not found for ExamGenie exam:', examId)
        return null
      }

      // Transform ExamGenie exam to legacy format
      const examgenieExam = examgenieResult.data as any
      exam = {
        exam_id: examgenieExam.id,
        subject: examgenieExam.subject,
        grade: examgenieExam.grade,
        status: 'created',
        created_at: examgenieExam.created_at,
        exam_json: {
          exam: {
            questions: (questionsResult.data as any).map((q: any) => ({
              id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              answer_text: q.correct_answer,
              explanation: q.explanation,
              max_points: q.max_points || 2
            }))
          },
          topic: examgenieExam.subject,
          difficulty: 'elementary'
        }
      }
    }

    if (!exam) {
      console.log('No exam found for submission:', examId)
      return null
    }

    // Determine if this is an ExamGenie exam or legacy exam
    const isExamGenieExam = !legacyExamResult.data && !!examgenieResult?.data

    // For legacy exams only: insert answers into answers table and create bridge record if needed
    if (!isExamGenieExam) {
      console.log('Processing legacy exam - inserting into answers table')

      // Insert student answers
      const answerResult = await DatabaseManager.insert(
        'answers',
        {
          exam_id: examId,
          answers_json: { answers }
        }
      )

      if (answerResult.error) {
        console.error('Failed to insert answers for legacy exam:', answerResult.error)
        return null
      }
    } else {
      console.log('Processing ExamGenie exam - skipping answers table and bridge record')
    }

    // Grade the exam using new grading service with personalized feedback
    // TODO: Extract language from exam data, request params, or browser locale
    const studentLanguage = 'fi' // For testing purposes - should be dynamic
    const gradingResult = await ExamGradingService.gradeExam(exam, answers, {
      useAiGrading: true
    })
    if (!gradingResult) {
      return null
    }

    // Save grading results
    const finalAttemptNumber = attemptNumber || 1

    console.log(`[submitAnswers] About to save grading for ${isExamGenieExam ? 'ExamGenie' : 'legacy'} exam`)
    console.log(`[submitAnswers] Grading data keys: ${Object.keys(gradingResult)}`)

    if (isExamGenieExam) {
      // For ExamGenie exams, use supabaseAdmin directly to bypass RLS
      console.log('[submitAnswers] Using supabaseAdmin for ExamGenie grading insert')
      const { data, error } = await supabaseAdmin!
        .from('examgenie_grading')
        .insert({
          exam_id: examId,
          grade_scale: '4-10',
          grading_json: gradingResult,
          final_grade: gradingResult.final_grade,
          grading_prompt: getGradingPrompt(),
          attempt_number: finalAttemptNumber
        })
        .select()
        .single()

      if (error) {
        console.error('[submitAnswers] ExamGenie grading insert failed:', error)
        return null
      }

      console.log('[submitAnswers] ExamGenie grading saved successfully')
    } else {
      // For legacy exams, use transaction with DatabaseManager
      console.log('[submitAnswers] Using transaction for legacy exam')
      const transactionResult = await DatabaseManager.transaction([
        () => DatabaseManager.insert('grading', {
          exam_id: examId,
          grade_scale: '4-10',
          grading_json: gradingResult,
          final_grade: gradingResult.final_grade,
          grading_prompt: getGradingPrompt(),
          attempt_number: finalAttemptNumber
        }),
        () => DatabaseManager.update('exams',
          { status: 'graded' },
          { exam_id: examId }
        )
      ], 'Submit Answers Transaction')

      if (transactionResult.error) {
        console.error('[submitAnswers] Transaction failed with error:', transactionResult.error)
        console.error('[submitAnswers] Transaction metadata:', transactionResult.metadata)
        return null
      }

      console.log('[submitAnswers] Legacy grading saved successfully')
    }

    // Update completed_at timestamp for ExamGenie exams
    if (isExamGenieExam && supabaseAdmin) {
      console.log('Updating completed_at for ExamGenie exam:', examId)
      const updateResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabaseAdmin!
            .from('examgenie_exams')
            .update({ completed_at: new Date().toISOString() })
            .eq('id', examId)
        },
        'Update ExamGenie Exam Completion Timestamp'
      )

      if (updateResult.error) {
        console.error('Failed to update completed_at:', updateResult.error)
        // Don't fail the entire operation - grading was successful
      } else {
        console.log('Successfully updated completed_at for exam:', examId)
      }
    }

    // Add attempt number to the result
    return {
      ...gradingResult,
      attempt_number: finalAttemptNumber
    }

  } catch (error) {
    return null
  }
}

// Get grading results
export async function getGradingResults(examId: string): Promise<GradingResult | null> {
  try {
    // Try ExamGenie grading table first (modern)
    const examGenieGradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('examgenie_grading')
          .select('*')
          .eq('exam_id', examId)
          .order('attempt_number', { ascending: false })
          .limit(1)
          .maybeSingle()
      },
      'Get ExamGenie Grading Results'
    )

    if (!examGenieGradingResult.error && examGenieGradingResult.data) {
      return (examGenieGradingResult.data as any).grading_json as GradingResult
    }

    // Fall back to legacy grading table (for production)
    const legacyGradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('grading')
          .select(`
            *,
            exams!inner(*)
          `)
          .eq('exam_id', examId)
          .order('attempt_number', { ascending: false })
          .limit(1)
          .maybeSingle()
      },
      'Get Legacy Grading Results'
    )

    if (legacyGradingResult.error || !legacyGradingResult.data) {
      return null
    }

    return (legacyGradingResult.data as any).grading_json as GradingResult

  } catch (error) {
    return null
  }
}