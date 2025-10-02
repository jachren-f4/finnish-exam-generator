'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamData, StudentAnswer } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'

interface ExamState extends ExamData {
  canReuse: boolean
  hasBeenCompleted: boolean
  latestGrading?: any
}

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<ExamState | null>(null)
  const [answers, setAnswers] = useState<{[questionId: string]: string}>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mode, setMode] = useState<'take' | 'review'>('take')

  useEffect(() => {
    if (examId) {
      fetchExam()
    }
  }, [examId])

  const fetchExam = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/exam/${examId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || EXAM_UI.LOAD_FAILED)
      }

      const responseData = await response.json()
      const examData = responseData.data || responseData // Handle both old and new API formats
      setExam(examData)

      // Determine initial mode based on exam state
      if (examData.hasBeenCompleted && examData.latestGrading) {
        setMode('review')
      } else {
        setMode('take')
      }
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : EXAM_UI.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const submitAnswers = async () => {
    if (!exam || isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const studentAnswers: StudentAnswer[] = Object.entries(answers).map(([questionId, answerText]) => ({
        question_id: questionId,
        answer_text: answerText
      }))

      const response = await fetch(`/api/exam/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: studentAnswers })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Answer submission failed')
      }

      const result = await response.json()
      
      // Redirect to grading page
      router.push(`/grading/${examId}`)
      
    } catch (error) {
      console.error('Error submitting answers:', error)
      setError(error instanceof Error ? error.message : 'Answer submission failed')
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const isAllAnswered = () => {
    if (!exam || !exam.questions || !Array.isArray(exam.questions)) return false
    return exam.questions.every(q => answers[q.id]?.trim())
  }

  const getProgress = () => {
    if (!exam || !exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) return 0
    const answeredCount = exam.questions.filter(q => answers[q.id]?.trim()).length
    return Math.round((answeredCount / exam.questions.length) * 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-6 sm:mt-4 text-base sm:text-sm text-gray-600">{EXAM_UI.LOADING}</p>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md mx-auto w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl sm:text-5xl mb-6 sm:mb-4">{ICONS.WARNING}</div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900 mb-3 sm:mb-2">{EXAM_UI.ERROR}</h1>
            <p className="text-base sm:text-sm text-gray-600 mb-6 sm:mb-4">{error || EXAM_UI.NOT_FOUND}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-medium min-h-[48px] transition-all active:scale-95"
            >
              {EXAM_UI.RETRY}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Ensure we have valid questions array and current question exists
  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md mx-auto w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl sm:text-5xl mb-6 sm:mb-4">{ICONS.WARNING}</div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900 mb-3 sm:mb-2">{EXAM_UI.ERROR}</h1>
            <p className="text-base sm:text-sm text-gray-600 mb-6 sm:mb-4">{EXAM_UI.NOT_FOUND}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-medium min-h-[48px] transition-all active:scale-95"
            >
              {EXAM_UI.RETRY}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = exam.questions[currentQuestion]

  // Additional safety check for current question
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md mx-auto w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl sm:text-5xl mb-6 sm:mb-4">{ICONS.WARNING}</div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900 mb-3 sm:mb-2">{EXAM_UI.ERROR}</h1>
            <p className="text-base sm:text-sm text-gray-600 mb-6 sm:mb-4">{EXAM_UI.NOT_FOUND}</p>
            <button
              onClick={() => setCurrentQuestion(0)}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-medium min-h-[48px] transition-all active:scale-95"
            >
              {EXAM_UI.RETRY}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Sticky */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-4 py-3 md:py-4 md:max-w-[640px] lg:max-w-[768px] md:mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{exam.subject}</h1>
              <p className="text-sm text-gray-600">{exam.grade}</p>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <p className="text-sm font-medium text-gray-700">{currentQuestion + 1}{EXAM_UI.QUESTION_OF}{exam.total_questions}</p>
              <div className="flex-1 sm:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      {exam.canReuse && exam.hasBeenCompleted && (
        <div className="bg-blue-50 border-b">
          <div className="w-full px-4 py-3 md:max-w-[640px] lg:max-w-[768px] md:mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <span className="text-sm text-blue-700 font-medium sm:hidden">{EXAM_UI.MODE}</span>
              <div className="flex bg-white rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setMode('take')}
                  className={`flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm font-medium rounded-md transition-all min-h-[48px] sm:min-h-0 ${
                    mode === 'take'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {EXAM_UI.RETAKE}
                </button>
                <button
                  onClick={() => setMode('review')}
                  className={`flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm font-medium rounded-md transition-all min-h-[48px] sm:min-h-0 ${
                    mode === 'review'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {EXAM_UI.REVIEW}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Flex grow to push navigation to bottom */}
      <div className="flex-1 w-full px-4 py-4 md:py-6 md:max-w-[640px] lg:max-w-[768px] md:mx-auto">
        {mode === 'take' ? (
          <>
            {/* Question Navigation - Hide on mobile, show on tablet+ */}
            <div className="hidden md:flex flex-wrap gap-2 mb-6">
              {(exam.questions || []).map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    index === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : answers[q.id]?.trim()
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {/* Current Question - Card Style */}
            <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 md:p-8 mb-4">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <span className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-blue-600 bg-blue-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                  {currentQ.question_type === 'multiple_choice' && `${ICONS.CIRCLE} ${EXAM_UI.MC}`}
                  {currentQ.question_type === 'true_false' && `${ICONS.TRUE_FALSE} ${EXAM_UI.TF}`}
                  {currentQ.question_type === 'short_answer' && `${ICONS.PENCIL} ${EXAM_UI.TEXT}`}
                  {currentQ.question_type === 'fill_in_the_blank' && `${ICONS.DOCUMENT} ${EXAM_UI.FILL}`}
                </span>
                <span className="flex items-center gap-1 text-sm sm:text-base text-gray-600 font-medium">{ICONS.STAR} {currentQ.max_points} {EXAM_UI.POINTS}</span>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-6">{currentQ.question_text}</h2>

              {/* Answer Input */}
              {currentQ.question_type === 'multiple_choice' && currentQ.options ? (
                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => (
                    <label key={idx} className="flex items-center space-x-3 sm:space-x-4 p-4 sm:p-3 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all min-h-[56px] active:scale-[0.98] active:bg-blue-50">
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={option}
                        checked={answers[currentQ.id] === option}
                        onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                        className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600"
                      />
                      <span className="text-base sm:text-base text-gray-900 flex-1">{option}</span>
                    </label>
                  ))}
                </div>
              ) : currentQ.question_type === 'true_false' ? (
                <div className="space-y-3">
                  {[EXAM_UI.TRUE, EXAM_UI.FALSE].map((option) => (
                    <label key={option} className="flex items-center space-x-3 sm:space-x-4 p-4 sm:p-3 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all min-h-[56px] active:scale-[0.98] active:bg-blue-50">
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={option === EXAM_UI.TRUE ? 'true' : 'false'}
                        checked={answers[currentQ.id] === (option === EXAM_UI.TRUE ? 'true' : 'false')}
                        onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                        className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600"
                      />
                      <span className="text-base sm:text-base text-gray-900 flex-1">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder={EXAM_UI.YOUR_ANSWER}
                  rows={5}
                  className="w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-base text-gray-900 placeholder-gray-400 min-h-[120px]"
                />
              )}
            </div>


            {/* Progress Summary - Hidden on mobile, visible on tablet+ */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm p-6 mb-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{EXAM_UI.PROGRESS}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{Object.keys(answers).filter(id => answers[id]?.trim()).length}</div>
                  <div className="text-sm text-gray-600">{EXAM_UI.DONE}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{(exam.questions?.length || 0) - Object.keys(answers).filter(id => answers[id]?.trim()).length}</div>
                  <div className="text-sm text-gray-600">{EXAM_UI.LEFT}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{getProgress()}%</div>
                  <div className="text-sm text-gray-600"></div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Review Mode */
          <div className="space-y-6 mb-6">
            {exam.latestGrading ? (
              <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="text-7xl sm:text-8xl mb-4">
                    {exam.latestGrading.percentage >= 80 ? '🎉' :
                     exam.latestGrading.percentage >= 60 ? '👍' : '📚'}
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
                    {exam.latestGrading.final_grade}
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-600">
                    {exam.latestGrading.total_points} / {exam.latestGrading.max_total_points} {EXAM_UI.POINTS}
                    ({exam.latestGrading.percentage}%)
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t pt-6">
                  <div>
                    <div className="text-3xl sm:text-2xl font-bold text-green-600">{exam.latestGrading.questions_correct}</div>
                    <div className="text-sm text-gray-600">{ICONS.CHECK}</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-2xl font-bold text-yellow-600">{exam.latestGrading.questions_partial}</div>
                    <div className="text-sm text-gray-600">~</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-2xl font-bold text-red-600">{exam.latestGrading.questions_incorrect}</div>
                    <div className="text-sm text-gray-600">{ICONS.CROSS}</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-2xl font-bold text-gray-900">{exam.latestGrading.questions_count}</div>
                    <div className="text-sm text-gray-600">{EXAM_UI.TOTAL}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-gray-500 text-4xl mb-4">{ICONS.CHART}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{EXAM_UI.NO_RESULTS}</h3>
                <p className="text-gray-600 mb-4">{EXAM_UI.NOT_GRADED_DESC}</p>
                <button
                  onClick={() => setMode('take')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  {EXAM_UI.START}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog - Mobile optimized */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-label={EXAM_UI.ARIA.SUBMIT_DIALOG}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">{ICONS.WARNING}</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{EXAM_UI.CONFIRM_SUBMIT}</h3>
              <p className="text-base text-gray-600">
                {EXAM_UI.SUBMIT_WARNING}
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-center gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium min-h-[48px] transition-all active:scale-95"
                aria-label={EXAM_UI.ARIA.CANCEL_SUBMISSION}
              >
                {EXAM_UI.CANCEL}
              </button>
              <button
                onClick={submitAnswers}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium min-h-[48px] transition-all active:scale-95"
                aria-label={EXAM_UI.ARIA.SUBMIT_ANSWERS}
              >
                {isSubmitting ? EXAM_UI.SENDING : EXAM_UI.SUBMIT}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation - Only in take mode */}
      {mode === 'take' && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg z-10">
          <div className="w-full px-4 py-4 md:max-w-[640px] lg:max-w-[768px] md:mx-auto">
            <div className="flex items-center justify-between gap-3">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[48px] transition-all active:scale-95"
                aria-label={EXAM_UI.ARIA.PREVIOUS_QUESTION}
              >
                {ICONS.ARROW_LEFT} <span className="hidden sm:inline">{EXAM_UI.PREV}</span>
              </button>

              {/* Progress Indicator */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-700">
                  {currentQuestion + 1}{EXAM_UI.QUESTION_OF}{exam.total_questions}
                </div>
                <div className="text-xs text-gray-500">{getProgress()}%</div>
              </div>

              {/* Next/Submit Button */}
              {currentQuestion === (exam.questions?.length || 0) - 1 ? (
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!isAllAnswered()}
                  className="flex items-center gap-2 px-4 sm:px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[48px] transition-all active:scale-95"
                  aria-label={EXAM_UI.ARIA.SUBMIT_ANSWERS}
                >
                  <span>{EXAM_UI.SUBMIT}</span> {ICONS.CHECK}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion(Math.min((exam.questions?.length || 0) - 1, currentQuestion + 1))}
                  className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium min-h-[48px] transition-all active:scale-95"
                  aria-label={EXAM_UI.ARIA.NEXT_QUESTION}
                >
                  <span className="hidden sm:inline">{EXAM_UI.NEXT}</span> {ICONS.ARROW_RIGHT}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}