import { supabase, DbExam, DbAnswer, DbGrading, ExamData, StudentAnswer, GradingResult } from './supabase'
import { processGeminiResponse, createFallbackExam } from './exam-transformer'

// Create a new exam from Gemini response
export async function createExam(geminiResponse: string): Promise<{ examId: string; examUrl: string; gradingUrl: string } | null> {
  try {
    console.log('=== CREATING EXAM DEBUG START ===')
    console.log('Gemini response length:', geminiResponse.length)
    console.log('First 200 chars:', geminiResponse.substring(0, 200))
    
    // Transform Gemini response to database format
    let examData = processGeminiResponse(geminiResponse)
    console.log('processGeminiResponse result:', examData ? 'SUCCESS' : 'FAILED')
    
    // Create fallback if Gemini response is invalid
    if (!examData) {
      console.log('Creating fallback exam from raw response')
      examData = createFallbackExam(geminiResponse)
      console.log('Fallback exam created:', examData ? 'SUCCESS' : 'FAILED')
    }

    console.log('About to insert exam into Supabase...')
    console.log('Exam data structure:', JSON.stringify(examData, null, 2))

    // Insert exam into database
    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        subject: examData.exam.subject,
        grade: examData.exam.grade,
        exam_json: examData,
        status: 'created'
      })
      .select('exam_id')
      .single()

    if (error) {
      console.error('Failed to create exam:', error)
      return null
    }

    const examId = exam.exam_id
    const baseUrl = 'https://exam-generator.vercel.app'
    
    return {
      examId,
      examUrl: `${baseUrl}/exam/${examId}`,
      gradingUrl: `${baseUrl}/grading/${examId}`
    }

  } catch (error) {
    console.error('Error creating exam:', error)
    return null
  }
}

// Get exam data for taking (without answers)
export async function getExamForTaking(examId: string): Promise<ExamData | null> {
  try {
    const { data: exam, error } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .eq('status', 'created')
      .single()

    if (error || !exam) {
      console.error('Exam not found or not available:', error)
      return null
    }

    // Transform database exam to display format (remove answers)
    const examJson = exam.exam_json
    const questions = examJson.exam.questions.map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      max_points: q.max_points
      // Note: answer_text and explanation excluded for exam taking
    }))

    const totalPoints = questions.reduce((sum: number, q: any) => sum + q.max_points, 0)

    return {
      exam_id: exam.exam_id,
      subject: exam.subject,
      grade: exam.grade,
      status: exam.status,
      created_at: exam.created_at,
      questions,
      total_questions: questions.length,
      max_total_points: totalPoints
    }

  } catch (error) {
    console.error('Error fetching exam:', error)
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
      console.error('Exam not found or already answered:', examError)
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
      console.error('Failed to save answers:', answerError)
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
        final_grade: gradingResult.final_grade
      })

    if (gradingError) {
      console.error('Failed to save grading:', gradingError)
      return null
    }

    // Update exam status to graded
    await supabase
      .from('exams')
      .update({ status: 'graded' })
      .eq('exam_id', examId)

    return gradingResult

  } catch (error) {
    console.error('Error submitting answers:', error)
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

    const gradedQuestions = questions.map((q: any) => {
      const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
      const studentText = studentAnswer?.answer_text?.trim().toLowerCase() || ''
      const correctText = q.answer_text?.trim().toLowerCase() || ''
      
      let pointsAwarded = 0
      let feedback = ''

      // Grading logic based on question type
      switch (q.question_type) {
        case 'multiple_choice':
          if (studentText === correctText) {
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
          if (studentText === correctText || 
              (correctText === 'true' && ['tosi', 'kyllä', 'oikein'].includes(studentText)) ||
              (correctText === 'false' && ['epätosi', 'ei', 'väärin'].includes(studentText))) {
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
          // Simple keyword matching for now
          if (studentText.includes(correctText) || correctText.includes(studentText)) {
            if (studentText === correctText) {
              pointsAwarded = q.max_points
              feedback = 'Oikein! Täydellinen vastaus.'
              correctCount++
            } else {
              pointsAwarded = Math.ceil(q.max_points * 0.7) // Partial credit
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
        percentage: Math.round((pointsAwarded / q.max_points) * 100),
        question_type: q.question_type,
        options: q.options
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
      questions_incorrect: incorrectCount
    }

  } catch (error) {
    console.error('Error grading exam:', error)
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
      console.error('Grading results not found:', error)
      return null
    }

    return grading.grading_json as GradingResult

  } catch (error) {
    console.error('Error fetching grading results:', error)
    return null
  }
}