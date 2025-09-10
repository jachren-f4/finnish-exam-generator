'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { GradingResult } from '@/lib/supabase'

export default function GradingPage() {
  const params = useParams()
  const examId = params?.id as string

  const [grading, setGrading] = useState<GradingResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllQuestions, setShowAllQuestions] = useState(false)

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
        throw new Error(errorData.error || 'Tulosten lataus epäonnistui')
      }

      const gradingData = await response.json()
      setGrading(gradingData)
      setError('')
    } catch (err) {
      console.error('Error fetching grading:', err)
      setError(err instanceof Error ? err.message : 'Tulosten lataus epäonnistui')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan tuloksia...</p>
        </div>
      </div>
    )
  }

  if (error || !grading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Virhe</h1>
            <p className="text-gray-600 mb-4">{error || 'Tuloksia ei löytynyt'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kokeen tulokset</h1>
          <p className="text-gray-600">{grading.subject} - {grading.grade}</p>
        </div>

        {/* Grade Summary */}
        <div className={`bg-white rounded-xl shadow-lg border-2 p-8 mb-8 ${getGradeBgColor(grading.final_grade)}`}>
          <div className="text-center">
            <div className={`text-8xl font-bold mb-4 ${getGradeColor(grading.final_grade)}`}>
              {grading.final_grade}
            </div>
            <p className="text-xl text-gray-700 mb-2">Arvosana asteikolla {grading.grade_scale}</p>
            <p className="text-lg text-gray-600">
              {grading.total_points} / {grading.max_total_points} pistettä ({grading.percentage}%)
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{grading.questions_correct}</div>
            <p className="text-gray-600">Oikein</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{grading.questions_partial}</div>
            <p className="text-gray-600">Osittain oikein</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{grading.questions_incorrect}</div>
            <p className="text-gray-600">Väärin</p>
          </div>
        </div>

        {/* Questions Toggle */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Vastaukset kysymyksittäin ({grading.questions_count} kpl)
            </h2>
            <span className={`transform transition-transform ${showAllQuestions ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showAllQuestions && (
            <div className="mt-6 space-y-6">
              {grading.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex-1">
                      {index + 1}. {question.question_text}
                    </h3>
                    <div className="ml-4 text-right">
                      <span className={`font-bold ${
                        question.percentage === 100 ? 'text-green-600' : 
                        question.percentage > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {question.points_awarded}/{question.max_points} pistettä
                      </span>
                      <p className="text-sm text-gray-500">{question.percentage}%</p>
                    </div>
                  </div>

                  {question.options && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Vaihtoehdot:</p>
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option, idx) => (
                          <span key={idx} className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Sinun vastauksesi:</p>
                      <p className="text-gray-900 bg-blue-50 p-2 rounded">
                        {question.student_answer || 'Ei vastausta'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Oikea vastaus:</p>
                      <p className="text-gray-900 bg-green-50 p-2 rounded">
                        {question.expected_answer}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded ${
                    question.percentage === 100 ? 'bg-green-50 border-l-4 border-green-400' :
                    question.percentage > 0 ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                    'bg-red-50 border-l-4 border-red-400'
                  }`}>
                    <p className="text-sm text-gray-700">{question.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Kokeen tiedot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p><span className="font-medium">Koe luotu:</span> {new Date(grading.created_at).toLocaleString('fi-FI')}</p>
              <p><span className="font-medium">Vastaukset lähetetty:</span> {new Date(grading.submitted_at).toLocaleString('fi-FI')}</p>
            </div>
            <div>
              <p><span className="font-medium">Arvosteltu:</span> {new Date(grading.graded_at).toLocaleString('fi-FI')}</p>
              <p><span className="font-medium">Kokeen tunnus:</span> {grading.exam_id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center space-x-4">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            🖨️ Tulosta tulokset
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
          >
            📝 Luo uusi koe
          </button>
        </div>
      </div>
    </div>
  )
}