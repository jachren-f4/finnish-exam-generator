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
    const gradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('grading')
          .select('*')
          .eq('exam_id', examId)
          .order('graded_at', { ascending: false })
          .limit(1)
      },
      'Get Latest Grading'
    )

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
export async function submitAnswers(examId: string, answers: StudentAnswer[]): Promise<GradingResult | null> {
  try {
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
      if (!supabaseAdmin) {
        console.error('supabaseAdmin not available for ExamGenie exam submission')
        return null
      }

      examgenieResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabaseAdmin!
            .from('examgenie_exams')
            .select('*')
            .eq('id', examId)
            .eq('status', 'READY')
            .maybeSingle()
        },
        'Get ExamGenie Exam for Submission'
      )

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

    // For ExamGenie exams, we need to create a bridge record in the legacy exams table
    // since the answers table has a foreign key constraint to exams, not examgenie_exams
    let isExamGenieExam = false
    if (!legacyExamResult.data && examgenieResult?.data) {
      isExamGenieExam = true
      console.log('Creating bridge record for ExamGenie exam in legacy table')

      // Create a minimal record in the legacy exams table for foreign key compatibility
      const bridgeResult = await DatabaseManager.executeQuery(
        async () => {
          return await supabase
            .from('exams')
            .insert({
              exam_id: examId,
              subject: exam.subject,
              grade: exam.grade,
              exam_json: exam.exam_json,
              status: 'created'
            })
            .select('exam_id')
            .single()
        },
        'Create Bridge Record for ExamGenie Exam'
      )

      if (bridgeResult.error) {
        console.error('Failed to create bridge record:', bridgeResult.error)
        return null
      }
    }

    // Insert student answers
    const answerResult = await DatabaseManager.insert(
      'answers',
      {
        exam_id: examId,
        answers_json: { answers }
      }
    )

    if (answerResult.error) {
      return null
    }

    // Grade the exam using new grading service with personalized feedback
    // TODO: Extract language from exam data, request params, or browser locale
    const studentLanguage = 'fi' // For testing purposes - should be dynamic
    const gradingResult = await ExamGradingService.gradeExam(exam, answers, {
      studentLanguage: studentLanguage
    })
    if (!gradingResult) {
      return null
    }

    // Use transaction to save grading and update status atomically
    const transactionResult = await DatabaseManager.transaction([
      // Save grading results
      () => DatabaseManager.insert('grading', {
        exam_id: examId,
        grade_scale: '4-10',
        grading_json: gradingResult,
        final_grade: gradingResult.final_grade,
        grading_prompt: getGradingPrompt()
      }),
      // Update exam status to graded
      () => DatabaseManager.update('exams', 
        { status: 'graded' }, 
        { exam_id: examId }
      )
    ], 'Submit Answers Transaction')

    if (transactionResult.error) {
      return null
    }

    return gradingResult

  } catch (error) {
    return null
  }
}

// Get grading results
export async function getGradingResults(examId: string): Promise<GradingResult | null> {
  try {
    const gradingResult = await DatabaseManager.executeQuery(
      async () => {
        return await supabase
          .from('grading')
          .select(`
            *,
            exams!inner(*)
          `)
          .eq('exam_id', examId)
          .single()
      },
      'Get Grading Results'
    )

    if (gradingResult.error || !gradingResult.data) {
      return null
    }

    return (gradingResult.data as any).grading_json as GradingResult

  } catch (error) {
    return null
  }
}