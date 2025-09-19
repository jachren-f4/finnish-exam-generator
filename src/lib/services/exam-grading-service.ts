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
  studentLanguage?: string // Language for feedback generation
}

/**
 * Exam Grading Service - Handles AI-powered and rule-based exam grading
 * Extracted from exam-service.ts to create focused grading functionality
 */
export class ExamGradingService {
  /**
   * Grade multiple questions with a single AI call (BATCH GRADING)
   */
  static async gradeQuestionsWithBatchAI(
    questions: any[],
    studentAnswers: StudentAnswer[]
  ): Promise<Map<string, QuestionGradingResult> | null> {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME })

      // Build batch grading prompt
      const questionsData = questions.map((q, index) => {
        const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
        const studentText = studentAnswer?.answer_text?.trim() || ''

        return `
KYSYMYS ${index + 1} (ID: ${q.id}):
Kysymysteksti: "${q.question_text}"
Kysymystyyppi: ${q.question_type}
Malliovastaus: "${q.answer_text}"
Maksimipisteet: ${q.max_points}
${q.options ? `Vastausvaihtoehdot: ${q.options.join(', ')}` : ''}
${q.explanation ? `Selitys: ${q.explanation}` : ''}
OPISKELIJAN VASTAUS: "${studentText}"
`
      }).join('\n---\n')

      const batchPrompt = `${getGradingPrompt()}

TEHTÄVÄ: Arvioi kaikki seuraavat kysymykset yhdessä erässä. Anna jokaiselle kysymykselle pisteet ja palaute.

${questionsData}

PALAUTUSMUOTO (JSON):
{
  "grading_results": [
    {
      "question_id": "kysymyksen ID",
      "points_awarded": pisteet (numero),
      "percentage": prosentti (numero),
      "feedback": "yksityiskohtainen palaute suomeksi",
      "grade_reasoning": "arviointiperustelut"
    }
  ]
}

Arvioi jokainen kysymys huolellisesti ja anna rakentavaa palautetta.`

      const result = await model.generateContent(batchPrompt)
      const responseText = result.response.text()

      // Log API usage for cost tracking
      const usageMetadata = result.response.usageMetadata
      if (usageMetadata) {
        const promptTokenCount = usageMetadata.promptTokenCount || 0
        const candidatesTokenCount = usageMetadata.candidatesTokenCount || 0
        const inputCost = (promptTokenCount / 1000000) * 0.10
        const outputCost = (candidatesTokenCount / 1000000) * 0.40
        const estimatedCost = inputCost + outputCost

        console.log('Gemini BATCH grading API usage:', {
          promptTokenCount,
          candidatesTokenCount,
          totalTokenCount: promptTokenCount + candidatesTokenCount,
          estimatedCost: estimatedCost.toFixed(6),
          questionsGraded: questions.length
        })
      }

      // Parse batch response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in Gemini batch grading response:', responseText)
        return null
      }

      const batchResult = JSON.parse(jsonMatch[0])
      const gradingResults = new Map<string, QuestionGradingResult>()

      // Process each graded question
      if (batchResult.grading_results && Array.isArray(batchResult.grading_results)) {
        batchResult.grading_results.forEach((result: any) => {
          const questionId = result.question_id
          const question = questions.find(q => q.id === questionId)
          if (question) {
            // Validate and constrain points
            const pointsAwarded = Math.max(0, Math.min(question.max_points, result.points_awarded || 0))

            gradingResults.set(questionId, {
              points_awarded: pointsAwarded,
              percentage: Math.round((pointsAwarded / question.max_points) * 100),
              feedback: result.feedback || 'Ei palautetta',
              grade_reasoning: result.grade_reasoning || 'Batch AI grading',
              usage_metadata: usageMetadata
            })
          }
        })
      }

      console.log(`✅ Batch graded ${gradingResults.size}/${questions.length} questions successfully`)
      return gradingResults

    } catch (error) {
      console.error('Batch AI grading failed:', error)
      return null
    }
  }

  /**
   * Generate personalized feedback in student's language
   */
  static async generatePersonalizedFeedback(
    gradingResult: GradingResult,
    studentLanguage: string = 'en',
    materialSummary?: string
  ): Promise<string | null> {
    try {
      const { LanguageService } = await import('./language-service')
      const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME })

      // Identify correct and incorrect questions
      const correctQuestions = gradingResult.questions.filter(q => q.percentage >= 95)
      const incorrectQuestions = gradingResult.questions.filter(q => q.percentage < 50)

      const feedbackPrompt = LanguageService.generateGradingPrompt(
        studentLanguage,
        parseInt(gradingResult.grade),
        gradingResult.total_points,
        correctQuestions.map(q => q.question_text),
        incorrectQuestions.map(q => q.question_text),
        materialSummary || 'Not available'
      )

      const result = await model.generateContent(feedbackPrompt)
      const feedbackText = result.response.text()

      // Log usage for tracking
      const usageMetadata = result.response.usageMetadata
      if (usageMetadata) {
        console.log('Feedback generation API usage:', {
          promptTokenCount: usageMetadata.promptTokenCount,
          candidatesTokenCount: usageMetadata.candidatesTokenCount,
          language: studentLanguage
        })
      }

      return feedbackText

    } catch (error) {
      console.error('Error generating personalized feedback:', error)
      return null
    }
  }

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

      // Try BATCH AI grading first if enabled
      let batchGradingResults: Map<string, QuestionGradingResult> | null = null
      if (useAiGrading) {
        try {
          console.log(`🚀 Starting BATCH grading for ${questions.length} questions...`)
          batchGradingResults = await this.gradeQuestionsWithBatchAI(questions, studentAnswers)
          if (batchGradingResults) {
            console.log(`✅ BATCH grading completed for ${batchGradingResults.size} questions`)
          }
        } catch (error) {
          console.warn('Batch AI grading failed, falling back to individual processing:', error)
        }
      }

      // Process all questions (using batch results where available)
      const gradedQuestions = questions.map((q: any) => {
        const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
        const studentText = studentAnswer?.answer_text?.trim() || ''
        let gradingResult: QuestionGradingResult | null = null
        let gradingMethod = 'rule-based'

        // Use batch result if available
        if (batchGradingResults && batchGradingResults.has(q.id)) {
          gradingResult = batchGradingResults.get(q.id)!
          gradingMethod = 'batch-gemini'
          console.log(`Question ${q.id} graded by BATCH Gemini: ${gradingResult.points_awarded}/${q.max_points} points`)
        }
        // Fallback to rule-based grading
        else {
          gradingResult = this.gradeQuestionWithRules(q, studentText, q.max_points)
          if (!batchGradingResults) {
            console.log(`Question ${q.id} graded by rules: ${gradingResult.points_awarded}/${q.max_points} points`)
          }
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
      })

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
      const geminiGradedCount = gradedQuestions.filter((q: any) => q.grading_method === 'batch-gemini' || q.grading_method === 'gemini').length
      const ruleBasedGradedCount = gradedQuestions.filter((q: any) => q.grading_method === 'rule-based').length
      
      // Aggregate Gemini API usage for cost tracking
      const totalGeminiUsage = gradedQuestions
        .filter((q: any) => q.usage_metadata)
        .reduce((acc: any, q: any) => {
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

      const baseResult = {
        exam_id: examData.exam_id,
        subject: examData.subject,
        grade: examData.grade,
        status: 'graded' as const,
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
          primary_method: (geminiGradedCount > ruleBasedGradedCount ? 'gemini' : 'rule-based') as 'gemini' | 'rule-based',
          gemini_available: !!process.env.GEMINI_API_KEY,
          total_gemini_usage: totalGeminiUsage,
          grading_prompt: getGradingPrompt()
        }
      }

      // Generate personalized feedback if language is specified
      if (options.studentLanguage) {
        const feedbackText = await this.generatePersonalizedFeedback(
          baseResult,
          options.studentLanguage,
          examData.ocr_raw_text // Use OCR text as material summary if available
        )
        if (feedbackText) {
          return {
            ...baseResult,
            personalized_feedback: feedbackText,
            feedback_language: options.studentLanguage
          } as any // Extended interface not defined yet
        }
      }

      return baseResult

    } catch (error) {
      console.error('Error in exam grading:', error)
      return null
    }
  }
}