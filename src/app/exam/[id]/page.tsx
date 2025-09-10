'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamData, StudentAnswer } from '@/lib/supabase'

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<ExamData | null>(null)
  const [answers, setAnswers] = useState<{[questionId: string]: string}>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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
        throw new Error(errorData.error || 'Kokeen lataus epäonnistui')
      }

      const examData = await response.json()
      setExam(examData)
      setError('')
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : 'Kokeen lataus epäonnistui')
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
    if (!exam) return

    try {
      setIsSubmitting(true)
      
      const studentAnswers: StudentAnswer[] = Object.entries(answers).map(([questionId, answerText]) => ({
        question_id: questionId,
        answer_text: answerText
      }))

      const response = await fetch(`/api/exam/${examId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: studentAnswers })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Vastausten lähettäminen epäonnistui')
      }

      const result = await response.json()
      
      // Redirect to grading results
      if (result.grading_url) {
        window.location.href = result.grading_url
      } else {
        router.push(`/grading/${examId}`)
      }

    } catch (err) {
      console.error('Error submitting answers:', err)
      setError(err instanceof Error ? err.message : 'Vastausten lähettäminen epäonnistui')
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const isAllAnswered = () => {
    if (!exam) return false
    return exam.questions.every(q => answers[q.id]?.trim())
  }

  const getProgress = () => {
    if (!exam) return 0
    const answeredCount = exam.questions.filter(q => answers[q.id]?.trim()).length
    return Math.round((answeredCount / exam.questions.length) * 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan koetta...</p>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Virhe</h1>
            <p className="text-gray-600 mb-4">{error || 'Koetta ei löytynyt'}</p>
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

  const currentQ = exam.questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.subject}</h1>
              <p className="text-gray-600">{exam.grade}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Kysymys {currentQuestion + 1} / {exam.total_questions}</p>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {exam.questions.map((q, index) => (
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

        {/* Current Question */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              {currentQ.question_type === 'multiple_choice' && 'Monivalinta'}
              {currentQ.question_type === 'true_false' && 'Tosi vai epätosi'}
              {currentQ.question_type === 'short_answer' && 'Lyhyt vastaus'}
              {currentQ.question_type === 'fill_in_the_blank' && 'Täydennä lause'}
            </span>
            <span className="text-sm text-gray-500">{currentQ.max_points} pistettä</span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">{currentQ.question_text}</h2>

          {/* Answer Input */}
          {currentQ.question_type === 'multiple_choice' && currentQ.options ? (
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => (
                <label key={idx} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={answers[currentQ.id] === option}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          ) : currentQ.question_type === 'true_false' ? (
            <div className="space-y-3">
              {['Tosi', 'Epätosi'].map((option) => (
                <label key={option} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option === 'Tosi' ? 'true' : 'false'}
                    checked={answers[currentQ.id] === (option === 'Tosi' ? 'true' : 'false')}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
              placeholder="Kirjoita vastauksesi tähän..."
              rows={4}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Edellinen
          </button>

          {currentQuestion === exam.questions.length - 1 ? (
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!isAllAnswered()}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Lähetä vastaukset
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(exam.questions.length - 1, currentQuestion + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Seuraava →
            </button>
          )}
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <p className="text-gray-600">
            Vastattu: <span className="font-semibold">{exam.questions.filter(q => answers[q.id]?.trim()).length} / {exam.total_questions}</span> kysymystä
          </p>
          {!isAllAnswered() && (
            <p className="text-orange-600 text-sm mt-1">Vastaa kaikkiin kysymyksiin ennen lähettämistä</p>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lähetä vastaukset?</h3>
            <p className="text-gray-600 mb-6">
              Olet vastannut kaikkiin {exam.total_questions} kysymykseen. 
              Haluatko lähettää vastauksesi arvosteltavaksi?
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Peruuta
              </button>
              <button
                onClick={submitAnswers}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{isSubmitting ? 'Lähetetään...' : 'Lähetä'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}