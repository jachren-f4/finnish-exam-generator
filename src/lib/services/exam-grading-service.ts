import { GoogleGenerativeAI } from '@google/generative-ai'
import { StudentAnswer, GradingResult } from '../supabase'
import { GEMINI_CONFIG, getGeminiApiKey, getGradingPrompt } from '../config'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())

export interface QuestionGradingResult {
  points_awarded: number
  percentage: number
  feedback: string
  grade_reasoning: string
  usage_metadata?: any
}

export interface ExamGradingOptions {
  gradeScale?: string
  useAiGrading?: boolean
}

/**
 * Exam Grading Service - Handles AI-powered and rule-based exam grading
 * Extracted from exam-service.ts to create focused grading functionality
 */
export class ExamGradingService {
  /**
   * Grade a single question using Gemini AI
   */
  static async gradeQuestionWithAI(
    question: any,
    studentAnswer: string,
    maxPoints: number
  ): Promise<QuestionGradingResult | null> {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME })
      
      const contextPrompt = `${getGradingPrompt()}

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
        model: GEMINI_CONFIG.MODEL_NAME
      }
      
      return gradingResult
      
    } catch (error) {
      console.error('Error in Gemini grading:', error)
      return null
    }
  }

  /**
   * Grade a question using rule-based logic (fallback method)
   */
  static gradeQuestionWithRules(
    question: any,
    studentAnswer: string,
    maxPoints: number
  ): QuestionGradingResult {
    const correctText = question.answer_text?.trim().toLowerCase() || ''
    const studentText = studentAnswer.trim().toLowerCase()
    let pointsAwarded = 0
    let feedback = ''

    switch (question.question_type) {
      case 'multiple_choice':
        if (studentText === correctText) {
          pointsAwarded = maxPoints
          feedback = 'Oikein! Hyvä vastaus.'
        } else {
          pointsAwarded = 0
          feedback = `Väärin. Oikea vastaus: ${question.answer_text}`
        }
        break

      case 'true_false':
        if (studentText === correctText || 
            (correctText === 'true' && ['tosi', 'kyllä', 'oikein'].includes(studentText)) ||
            (correctText === 'false' && ['epätosi', 'ei', 'väärin'].includes(studentText))) {
          pointsAwarded = maxPoints
          feedback = 'Oikein!'
        } else {
          pointsAwarded = 0
          feedback = `Väärin. Oikea vastaus: ${correctText === 'true' ? 'Tosi' : 'Epätosi'}`
        }
        break

      case 'short_answer':
      case 'fill_in_the_blank':
        if (studentText.includes(correctText) || correctText.includes(studentText)) {
          if (studentText === correctText) {
            pointsAwarded = maxPoints
            feedback = 'Oikein! Täydellinen vastaus.'
          } else {
            pointsAwarded = Math.ceil(maxPoints * 0.7)
            feedback = `Osittain oikein. Malliovastaus: ${question.answer_text}`
          }
        } else {
          pointsAwarded = 0
          feedback = `Katso malliovastausta: ${question.answer_text}`
        }
        break

      default:
        pointsAwarded = 0
        feedback = 'Tuntematon kysymystyyppi'
    }

    return {
      points_awarded: pointsAwarded,
      percentage: Math.round((pointsAwarded / maxPoints) * 100),
      feedback,
      grade_reasoning: 'Rule-based grading'
    }
  }

  /**
   * Grade an entire exam
   */
  static async gradeExam(
    examData: any, 
    studentAnswers: StudentAnswer[],
    options: ExamGradingOptions = {}
  ): Promise<GradingResult | null> {
    try {
      const questions = examData.exam_json.exam.questions
      const useAiGrading = options.useAiGrading !== false && process.env.GEMINI_API_KEY
      
      let totalPoints = 0
      let maxTotalPoints = 0
      let correctCount = 0
      let partialCount = 0
      let incorrectCount = 0

      // Grade questions using AI with fallback to rule-based
      const gradedQuestions = await Promise.all(questions.map(async (q: any) => {
        const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
        const studentText = studentAnswer?.answer_text?.trim() || ''
        let gradingResult: QuestionGradingResult | null = null
        let gradingMethod = 'rule-based'

        // Try AI grading first if enabled
        if (studentText && useAiGrading) {
          try {
            gradingResult = await this.gradeQuestionWithAI(q, studentText, q.max_points)
            if (gradingResult) {
              gradingMethod = 'gemini'
              console.log(`Question ${q.id} graded by Gemini: ${gradingResult.points_awarded}/${q.max_points} points`)
            }
          } catch (error) {
            console.warn(`AI grading failed for question ${q.id}, falling back to rule-based:`, error)
          }
        }

        // Fallback to rule-based grading
        if (!gradingResult) {
          gradingResult = this.gradeQuestionWithRules(q, studentText, q.max_points)
        }

        // Update counters
        const percentage = (gradingResult.points_awarded / q.max_points) * 100
        if (percentage >= 95) correctCount++
        else if (percentage >= 50) partialCount++
        else incorrectCount++

        totalPoints += gradingResult.points_awarded
        maxTotalPoints += q.max_points

        return {
          id: q.id,
          question_text: q.question_text,
          expected_answer: q.answer_text,
          student_answer: studentAnswer?.answer_text || '',
          points_awarded: gradingResult.points_awarded,
          max_points: q.max_points,
          feedback: gradingResult.feedback,
          grade_reasoning: gradingResult.grade_reasoning,
          percentage: gradingResult.percentage,
          question_type: q.question_type,
          options: q.options,
          grading_method: gradingMethod,
          usage_metadata: gradingResult.usage_metadata
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
        exam_id: examData.exam_id,
        subject: examData.subject,
        grade: examData.grade,
        status: 'graded',
        final_grade: finalGrade,
        grade_scale: options.gradeScale || '4-10',
        total_points: totalPoints,
        max_total_points: maxTotalPoints,
        percentage: Math.round(percentage),
        questions: gradedQuestions,
        graded_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_at: examData.created_at,
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
      console.error('Error in exam grading:', error)
      return null
    }
  }
}