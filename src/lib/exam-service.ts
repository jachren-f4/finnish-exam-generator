import { supabase, DbExam, ExamData, StudentAnswer, GradingResult } from './supabase'
import { processGeminiResponse, createFallbackExam } from './exam-transformer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExamCreator, ExamCreationOptions } from './services/exam-creator'
import { ExamRepository } from './services/exam-repository'
import { GEMINI_CONFIG, getGeminiApiKey, getGradingPrompt } from './config'
import { calculateGeminiCost, aggregateUsageMetadata, CostTracker } from './utils/cost-calculator'
import { createTimer, endTimer } from './utils/performance-logger'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())


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
    const { data: grading, error: gradingError } = await supabase
      .from('grading')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })
      .limit(1)

    const hasBeenCompleted = !gradingError && grading && grading.length > 0
    const latestGrading = hasBeenCompleted ? grading[0] : null

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
    // First, get the original exam with correct answers
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .eq('status', 'created')
      .single()

    if (examError || !exam) {
      return null
    }

    // Insert student answers
    const { error: answerError } = await supabase
      .from('answers')
      .insert({
        exam_id: examId,
        answers_json: { answers }
      })

    if (answerError) {
      return null
    }

    // Grade the exam
    const gradingResult = await gradeExam(exam, answers)
    if (!gradingResult) {
      return null
    }

    // Save grading results
    const { error: gradingError } = await supabase
      .from('grading')
      .insert({
        exam_id: examId,
        grade_scale: '4-10',
        grading_json: gradingResult,
        final_grade: gradingResult.final_grade,
        grading_prompt: getGradingPrompt()
      })

    if (gradingError) {
      return null
    }

    // Update exam status to graded
    await supabase
      .from('exams')
      .update({ status: 'graded' })
      .eq('exam_id', examId)

    return gradingResult

  } catch (error) {
    return null
  }
}

// Grade a single question using Gemini AI
async function gradeQuestionWithGemini(
  question: any,
  studentAnswer: string,
  maxPoints: number
): Promise<{
  points_awarded: number;
  percentage: number;
  feedback: string;
  grade_reasoning: string;
  usage_metadata?: any;
} | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    
    const contextPrompt = `${GEMINI_GRADING_PROMPT}

KYSYMYKSEN TIEDOT:
Kysymys: "${question.question_text}"
Kysymystyyppi: ${question.question_type}
Malliovastaus: "${question.answer_text}"
Maksimipisteet: ${maxPoints}
${question.options ? `Vastausvaihtoehdot: ${question.options.join(', ')}` : ''}
${question.explanation ? `Selitys: ${question.explanation}` : ''}

OPISKELIJAN VASTAUS: "${studentAnswer}"

Arvioi vastaus ja anna pisteet välillä 0-${maxPoints}.`

    const result = await model.generateContent(contextPrompt)
    const responseText = result.response.text()
    
    // Log API usage for cost tracking
    const usageMetadata = result.response.usageMetadata
    
    // Calculate cost (Gemini 2.5 Flash Lite pricing as of 2025)
    const inputCostPer1M = 0.10   // $0.10 per 1M input tokens
    const outputCostPer1M = 0.40  // $0.40 per 1M output tokens
    
    const promptTokenCount = usageMetadata?.promptTokenCount || 0
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || 0
    const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
    
    const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
    const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
    const estimatedCost = inputCost + outputCost
    
    if (usageMetadata) {
      console.log('Gemini grading API usage:', {
        promptTokenCount,
        candidatesTokenCount,
        totalTokenCount,
        estimatedCost: estimatedCost.toFixed(6)
      })
    }
    
    // Parse Gemini response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Gemini grading response:', responseText)
      return null
    }
    
    const gradingResult = JSON.parse(jsonMatch[0])
    
    // Validate and constrain points
    gradingResult.points_awarded = Math.max(0, Math.min(maxPoints, gradingResult.points_awarded || 0))
    gradingResult.percentage = Math.round((gradingResult.points_awarded / maxPoints) * 100)
    
    // Add usage metadata with cost calculations for tracking
    gradingResult.usage_metadata = {
      ...usageMetadata,
      inputCost,
      outputCost,
      estimatedCost,
      model: 'gemini-2.5-flash-lite'
    }
    
    return gradingResult
    
  } catch (error) {
    console.error('Error in Gemini grading:', error)
    return null
  }
}

// Grade an exam by comparing student answers to correct answers
async function gradeExam(exam: DbExam, studentAnswers: StudentAnswer[]): Promise<GradingResult | null> {
  try {
    const examJson = exam.exam_json
    const questions = examJson.exam.questions
    
    let totalPoints = 0
    let maxTotalPoints = 0
    let correctCount = 0
    let partialCount = 0
    let incorrectCount = 0

    // Grade questions using Gemini AI with fallback to rule-based
    const gradedQuestions = await Promise.all(questions.map(async (q: any) => {
      const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
      const studentText = studentAnswer?.answer_text?.trim() || ''
      let pointsAwarded = 0
      let feedback = ''
      let gradeReasoning = ''
      let gradingMethod = 'rule-based' // Track which method was used
      let usageMetadata = null

      // Try Gemini grading first
      if (studentText && process.env.GEMINI_API_KEY) {
        try {
          const geminiResult = await gradeQuestionWithGemini(q, studentText, q.max_points)
          if (geminiResult) {
            pointsAwarded = geminiResult.points_awarded
            feedback = geminiResult.feedback
            gradeReasoning = geminiResult.grade_reasoning
            gradingMethod = 'gemini'
            usageMetadata = geminiResult.usage_metadata
            console.log(`Question ${q.id} graded by Gemini: ${pointsAwarded}/${q.max_points} points`)
          }
        } catch (error) {
          console.warn(`Gemini grading failed for question ${q.id}, falling back to rule-based:`, error)
        }
      }

      // Fallback to rule-based grading if Gemini failed or no API key
      if (gradingMethod === 'rule-based') {
        const correctText = q.answer_text?.trim().toLowerCase() || ''
        const studentTextLower = studentText.toLowerCase()

        switch (q.question_type) {
          case 'multiple_choice':
            if (studentTextLower === correctText) {
              pointsAwarded = q.max_points
              feedback = 'Oikein! Hyvä vastaus.'
              correctCount++
            } else {
              pointsAwarded = 0
              feedback = `Väärin. Oikea vastaus: ${q.answer_text}`
              incorrectCount++
            }
            break

          case 'true_false':
            if (studentTextLower === correctText || 
                (correctText === 'true' && ['tosi', 'kyllä', 'oikein'].includes(studentTextLower)) ||
                (correctText === 'false' && ['epätosi', 'ei', 'väärin'].includes(studentTextLower))) {
              pointsAwarded = q.max_points
              feedback = 'Oikein!'
              correctCount++
            } else {
              pointsAwarded = 0
              feedback = `Väärin. Oikea vastaus: ${correctText === 'true' ? 'Tosi' : 'Epätosi'}`
              incorrectCount++
            }
            break

          case 'short_answer':
          case 'fill_in_the_blank':
            if (studentTextLower.includes(correctText) || correctText.includes(studentTextLower)) {
              if (studentTextLower === correctText) {
                pointsAwarded = q.max_points
                feedback = 'Oikein! Täydellinen vastaus.'
                correctCount++
              } else {
                pointsAwarded = Math.ceil(q.max_points * 0.7)
                feedback = `Osittain oikein. Malliovastaus: ${q.answer_text}`
                partialCount++
              }
            } else {
              pointsAwarded = 0
              feedback = `Katso malliovastausta: ${q.answer_text}`
              incorrectCount++
            }
            break

          default:
            pointsAwarded = 0
            feedback = 'Tuntematon kysymystyyppi'
            incorrectCount++
        }
      }

      // Update counters for Gemini grading
      if (gradingMethod === 'gemini') {
        const percentage = (pointsAwarded / q.max_points) * 100
        if (percentage >= 95) correctCount++
        else if (percentage >= 50) partialCount++
        else incorrectCount++
      }

      totalPoints += pointsAwarded
      maxTotalPoints += q.max_points

      return {
        id: q.id,
        question_text: q.question_text,
        expected_answer: q.answer_text,
        student_answer: studentAnswer?.answer_text || '',
        points_awarded: pointsAwarded,
        max_points: q.max_points,
        feedback,
        grade_reasoning: gradeReasoning,
        percentage: Math.round((pointsAwarded / q.max_points) * 100),
        question_type: q.question_type,
        options: q.options,
        grading_method: gradingMethod,
        usage_metadata: usageMetadata
      }
    }))

    // Calculate final grade (Finnish scale 4-10)
    const percentage = (totalPoints / maxTotalPoints) * 100
    let finalGrade: string
    if (percentage >= 90) finalGrade = '10'
    else if (percentage >= 80) finalGrade = '9'
    else if (percentage >= 70) finalGrade = '8'
    else if (percentage >= 60) finalGrade = '7'
    else if (percentage >= 50) finalGrade = '6'
    else if (percentage >= 40) finalGrade = '5'
    else finalGrade = '4'

    // Calculate grading method statistics and API usage
    const geminiGradedCount = gradedQuestions.filter(q => q.grading_method === 'gemini').length
    const ruleBasedGradedCount = gradedQuestions.filter(q => q.grading_method === 'rule-based').length
    
    // Aggregate Gemini API usage for cost tracking
    const totalGeminiUsage = gradedQuestions
      .filter(q => q.usage_metadata)
      .reduce((acc, q) => {
        const usage = q.usage_metadata
        return {
          promptTokenCount: (acc.promptTokenCount || 0) + (usage?.promptTokenCount || 0),
          candidatesTokenCount: (acc.candidatesTokenCount || 0) + (usage?.candidatesTokenCount || 0),
          totalTokenCount: (acc.totalTokenCount || 0) + (usage?.totalTokenCount || 0),
          inputCost: (acc.inputCost || 0) + (usage?.inputCost || 0),
          outputCost: (acc.outputCost || 0) + (usage?.outputCost || 0),
          estimatedCost: (acc.estimatedCost || 0) + (usage?.estimatedCost || 0)
        }
      }, { 
        promptTokenCount: 0, 
        candidatesTokenCount: 0, 
        totalTokenCount: 0,
        inputCost: 0,
        outputCost: 0,
        estimatedCost: 0
      })

    return {
      exam_id: exam.exam_id,
      subject: exam.subject,
      grade: exam.grade,
      status: 'graded',
      final_grade: finalGrade,
      grade_scale: '4-10',
      total_points: totalPoints,
      max_total_points: maxTotalPoints,
      percentage: Math.round(percentage),
      questions: gradedQuestions,
      graded_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      created_at: exam.created_at,
      questions_count: questions.length,
      questions_correct: correctCount,
      questions_partial: partialCount,
      questions_incorrect: incorrectCount,
      grading_metadata: {
        gemini_graded: geminiGradedCount,
        rule_based_graded: ruleBasedGradedCount,
        primary_method: geminiGradedCount > ruleBasedGradedCount ? 'gemini' : 'rule-based',
        gemini_available: !!process.env.GEMINI_API_KEY,
        total_gemini_usage: totalGeminiUsage,
        grading_prompt: getGradingPrompt()
      }
    }

  } catch (error) {
    return null
  }
}

// Get grading results
export async function getGradingResults(examId: string): Promise<GradingResult | null> {
  try {
    const { data: grading, error } = await supabase
      .from('grading')
      .select(`
        *,
        exams!inner(*)
      `)
      .eq('exam_id', examId)
      .single()

    if (error || !grading) {
      return null
    }

    return grading.grading_json as GradingResult

  } catch (error) {
    return null
  }
}