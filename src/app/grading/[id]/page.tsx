'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { GradingResult } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'

export default function GradingPage() {
  const params = useParams()
  const examId = params?.id as string

  const [grading, setGrading] = useState<GradingResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllQuestions, setShowAllQuestions] = useState(true)

  useEffect(() => {
    if (examId) {
      fetchGrading()
    }
  }, [examId])

  const fetchGrading = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/exam/${examId}/grade`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load results')
      }

      const responseData = await response.json()
      const gradingData = responseData.data || responseData // Handle both old and new API formats
      setGrading(gradingData)
      setError('')
    } catch (err) {
      console.error('Error fetching grading:', err)
      setError(err instanceof Error ? err.message : EXAM_UI.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    const gradeNum = parseInt(grade)
    if (gradeNum >= 9) return 'text-green-600'
    if (gradeNum >= 7) return 'text-blue-600'
    if (gradeNum >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeBgColor = (grade: string) => {
    const gradeNum = parseInt(grade)
    if (gradeNum >= 9) return 'bg-green-100 border-green-200'
    if (gradeNum >= 7) return 'bg-blue-100 border-blue-200'
    if (gradeNum >= 5) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
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

  if (error || !grading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md mx-auto w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl sm:text-5xl mb-6 sm:mb-4">{ICONS.WARNING}</div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900 mb-3 sm:mb-2">{EXAM_UI.ERROR}</h1>
            <p className="text-base sm:text-sm text-gray-600 mb-6 sm:mb-4">{error || EXAM_UI.NO_RESULTS}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="w-full px-4 md:max-w-[640px] lg:max-w-[768px] md:mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{EXAM_UI.RESULTS_TITLE}</h1>
          <p className="text-sm sm:text-base text-gray-600">{grading.subject} - {grading.grade}</p>
        </div>

        {/* Grade Summary */}
        <div className={`bg-white rounded-xl shadow-lg border-2 p-6 sm:p-8 mb-6 sm:mb-8 ${getGradeBgColor(grading.final_grade)}`}>
          <div className="text-center">
            <div className={`text-7xl sm:text-8xl md:text-9xl font-bold mb-4 ${getGradeColor(grading.final_grade)}`}>
              {grading.final_grade}
            </div>
            <p className="text-lg sm:text-xl text-gray-700 mb-2">{EXAM_UI.GRADE_SCALE} {grading.grade_scale}</p>
            <p className="text-base sm:text-lg text-gray-600">
              {grading.total_points} / {grading.max_total_points} {EXAM_UI.POINTS} ({grading.percentage}%)
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 text-center">
            <div className="text-4xl sm:text-3xl font-bold text-green-600 mb-2">{grading.questions_correct}</div>
            <p className="text-sm sm:text-base text-gray-600">{ICONS.CHECK} {EXAM_UI.CORRECT}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 text-center">
            <div className="text-4xl sm:text-3xl font-bold text-yellow-600 mb-2">{grading.questions_partial}</div>
            <p className="text-sm sm:text-base text-gray-600">~ {EXAM_UI.PARTIAL}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 text-center col-span-2 md:col-span-1">
            <div className="text-4xl sm:text-3xl font-bold text-red-600 mb-2">{grading.questions_incorrect}</div>
            <p className="text-sm sm:text-base text-gray-600">{ICONS.CROSS} {EXAM_UI.INCORRECT}</p>
          </div>
        </div>

        {/* Questions Toggle */}
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 mb-6 sm:mb-8">
          <button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="flex items-center justify-between w-full text-left min-h-[48px]"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {EXAM_UI.ANSWERS_BY_QUESTION} ({grading.questions_count})
            </h2>
            <span className={`transform transition-transform text-xl ${showAllQuestions ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showAllQuestions && (
            <div className="mt-6 space-y-4 sm:space-y-6">
              {(grading.questions || []).map((question, index) => (
                <div key={question.id} className="border-2 rounded-xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 flex-1">
                      {index + 1}. {question.question_text}
                    </h3>
                    <div className="text-left sm:text-right sm:ml-4">
                      <span className={`font-bold text-lg ${
                        question.percentage === 100 ? 'text-green-600' :
                        question.percentage > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {question.points_awarded}/{question.max_points} {EXAM_UI.POINTS}
                      </span>
                      <p className="text-sm text-gray-500">{question.percentage}%</p>
                    </div>
                  </div>

                  {question.options && (
                    <div className="mb-4">
                      <p className="text-sm sm:text-base font-medium text-gray-700 mb-2">{EXAM_UI.OPTIONS}</p>
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option, idx) => (
                          <span key={idx} className="text-sm sm:text-base bg-gray-100 px-3 py-1.5 rounded-lg">
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 mb-4">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-gray-700 mb-2">{EXAM_UI.YOUR_ANSWER_LABEL}</p>
                      <p className="text-sm sm:text-base text-gray-900 bg-blue-50 p-3 sm:p-4 rounded-lg">
                        {question.student_answer || EXAM_UI.YOUR_ANSWER}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-gray-700 mb-2">{EXAM_UI.CORRECT_ANSWER_LABEL}</p>
                      <p className="text-sm sm:text-base text-gray-900 bg-green-50 p-3 sm:p-4 rounded-lg">
                        {question.expected_answer}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    question.percentage === 100 ? 'bg-green-50 border-l-4 border-green-400' :
                    question.percentage > 0 ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                    'bg-red-50 border-l-4 border-red-400'
                  }`}>
                    <p className="text-sm sm:text-base text-gray-700 mb-3">{question.feedback}</p>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <span>{EXAM_UI.GRADING_METHOD} {question.grading_method === 'gemini' ? `🤖 ${EXAM_UI.AI_GRADING}` : `📏 ${EXAM_UI.RULE_BASED}`}</span>
                      <span>{EXAM_UI.QUESTION}: {question.question_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Metadata */}
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 mb-6 sm:mb-8">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-4">{EXAM_UI.EXAM_INFO}</h3>
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 text-sm sm:text-base text-gray-600 mb-4">
            <div className="space-y-2">
              <p><span className="font-medium">{EXAM_UI.CREATED}</span> {new Date(grading.created_at).toLocaleString('fi-FI')}</p>
              <p><span className="font-medium">{EXAM_UI.SUBMITTED}</span> {new Date(grading.submitted_at).toLocaleString('fi-FI')}</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">{EXAM_UI.GRADED}</span> {new Date(grading.graded_at).toLocaleString('fi-FI')}</p>
              <p><span className="font-medium">{EXAM_UI.EXAM_ID}</span> {grading.exam_id ? grading.exam_id.slice(0, 8) + '...' : EXAM_UI.NOT_AVAILABLE}</p>
            </div>
          </div>
          
          {grading.grading_metadata && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm sm:text-base text-gray-800 mb-3">{EXAM_UI.GRADING_INFO}</h4>
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 text-sm sm:text-base text-gray-600">
                <div className="space-y-2">
                  <p><span className="font-medium">{EXAM_UI.GRADING_METHOD}</span> {grading.grading_metadata.primary_method === 'gemini' ? `🤖 ${EXAM_UI.AI_GRADING}` : `📏 ${EXAM_UI.RULE_BASED}`}</p>
                  <p><span className="font-medium">{EXAM_UI.AI_GRADED}</span> {grading.grading_metadata.gemini_graded || 0} {EXAM_UI.QUESTIONS_COUNT}</p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-medium">{EXAM_UI.RULE_BASED_GRADED}</span> {grading.grading_metadata.rule_based_graded || 0} {EXAM_UI.QUESTIONS_COUNT}</p>
                  <p><span className="font-medium">{EXAM_UI.AI_AVAILABLE}</span> {grading.grading_metadata.gemini_available ? `✅ ${EXAM_UI.YES}` : `❌ ${EXAM_UI.NO}`}</p>
                </div>
              </div>

              {grading.grading_metadata.total_gemini_usage && grading.grading_metadata.total_gemini_usage.totalTokenCount > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs sm:text-sm text-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{EXAM_UI.AI_USAGE}</span>
                    <span className="font-mono">{grading.grading_metadata.total_gemini_usage.totalTokenCount} {EXAM_UI.TOKENS}</span>
                  </div>
                  {grading.grading_metadata.total_gemini_usage.estimatedCost > 0 && (
                    <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                      <span className="font-medium">{EXAM_UI.ESTIMATED_COST}</span>
                      <span className="font-mono">${grading.grading_metadata.total_gemini_usage.estimatedCost.toFixed(6)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center">
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-medium min-h-[48px] transition-all active:scale-95"
          >
            🖨️ {EXAM_UI.PRINT_RESULTS}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto bg-gray-600 text-white px-8 py-3 rounded-xl hover:bg-gray-700 font-medium min-h-[48px] transition-all active:scale-95"
          >
            📝 {EXAM_UI.NEW_EXAM}
          </button>
        </div>
      </div>
    </div>
  )
}