'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  question_number: number
  question_text: string
  question_type: string
  options?: string[]
  max_points: number
}

interface SharedExam {
  id: string
  subject: string
  grade: string
  created_at: string
  completed_at: string
  share_id: string
  student_name?: string
  student_grade?: number
  questions: Question[]
  question_count: number
  total_points: number
  sharing_url?: string
}

export default function SharedExamPage() {
  const params = useParams()
  const share_id = params?.share_id as string

  const [exam, setExam] = useState<SharedExam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!share_id) return

    const fetchSharedExam = async () => {
      try {
        const response = await fetch(`/api/shared/exam/${share_id}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load exam')
        }

        const data = await response.json()
        setExam(data.exam)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedExam()
  }, [share_id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan koetta...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Koetta ei löytynyt</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Tarkista että linkki on oikea tai ota yhteyttä kokeen jakajaan.
          </p>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Koetta ei löytynyt</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print header */}
      <div className="print:block hidden">
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold">ExamGenie</h1>
          <p className="text-gray-600">Automaattisesti luotu koe</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-4">
        {/* Screen-only controls */}
        <div className="print:hidden mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jaettu koe</h1>
            <p className="text-gray-600 mt-1">Julkinen näkymä</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🖨️ Tulosta
          </button>
        </div>

        {/* Exam header */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8 print:bg-white print:border print:rounded-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {exam.subject} - {exam.grade}. luokka
              </h2>
              {exam.student_name && (
                <p className="text-gray-700">
                  <span className="font-medium">Oppilaan nimi:</span> {exam.student_name}
                </p>
              )}
              <p className="text-gray-700">
                <span className="font-medium">Luotu:</span>{' '}
                {new Date(exam.created_at).toLocaleDateString('fi-FI')}
              </p>
            </div>
            <div className="text-right print:text-left">
              <p className="text-gray-700">
                <span className="font-medium">Kysymyksiä:</span> {exam.question_count}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Pisteitä yhteensä:</span> {exam.total_points}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Koe-ID: {exam.share_id}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8 print:bg-white print:border-gray-300">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Ohjeet</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Lue jokainen kysymys huolellisesti</li>
            <li>• Vastaa kaikkiin kysymyksiin</li>
            <li>• Monivalintakysymyksissä valitse yksi oikea vastaus</li>
            <li>• Kirjoita vastaukset selkeästi</li>
          </ul>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {exam.questions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-6 print:border-gray-400 print:rounded-none print:break-inside-avoid">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {question.question_number}. {question.question_text}
                </h3>
                <span className="text-sm text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded print:bg-white print:border">
                  {question.max_points} p
                </span>
              </div>

              {question.question_type === 'multiple_choice' && question.options && (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center">
                      <div className="w-4 h-4 border border-gray-400 rounded-full mr-3 print:border-black"></div>
                      <span className="text-gray-700">{String.fromCharCode(65 + optionIndex)}) {option}</span>
                    </div>
                  ))}
                </div>
              )}

              {question.question_type !== 'multiple_choice' && (
                <div className="mt-4">
                  <div className="border border-gray-300 rounded p-4 min-h-20 print:border-black print:rounded-none">
                    <p className="text-gray-400 text-sm">Kirjoita vastauksesi tähän...</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 print:border-black">
          <p className="text-sm">
            Luotu <span className="font-medium text-blue-600">ExamGenie</span>-sovelluksella
          </p>
          <p className="text-xs mt-1 print:hidden">
            {exam.sharing_url}
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .print\\:break-inside-avoid {
            break-inside: avoid;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          .print\\:border {
            border: 1px solid #000 !important;
          }

          .print\\:border-gray-300 {
            border: 1px solid #666 !important;
          }

          .print\\:border-gray-400 {
            border: 1px solid #666 !important;
          }

          .print\\:border-black {
            border: 1px solid #000 !important;
          }

          .print\\:rounded-none {
            border-radius: 0 !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:text-left {
            text-align: left !important;
          }

          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .print\\:py-4 {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}