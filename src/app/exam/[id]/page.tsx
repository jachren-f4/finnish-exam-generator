'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Script from 'next/script'
import type { ExamData, StudentAnswer } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'
import { NavigationDots } from '@/components/exam/NavigationDots'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'

interface ExamState extends ExamData {
  canReuse: boolean
  hasBeenCompleted: boolean
  latestGrading?: any
  audio_url?: string | null
  summary_text?: string | null
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

  // Render LaTeX math notation with KaTeX
  useEffect(() => {
    const renderMath = () => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        try {
          (window as any).renderMathInElement(document.body, {
            delimiters: [
              { left: "$$", right: "$$", display: true },   // Block math
              { left: "$", right: "$", display: false }      // Inline math
            ],
            throwOnError: false  // Don't break on invalid LaTeX
          })
        } catch (error) {
          console.warn('KaTeX rendering failed:', error)
        }
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderMath, 100)
    return () => clearTimeout(timer)
  }, [currentQuestion, exam])  // Re-render when question changes

  const fetchExam = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/exam/${examId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || EXAM_UI.LOAD_FAILED)
      }

      const responseData = await response.json()
      const examData = responseData.data || responseData
      setExam(examData)

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
      <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `3px solid ${COLORS.border.light}`,
            borderTop: `3px solid ${COLORS.primary.dark}`,
            borderRadius: RADIUS.full,
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{
            marginTop: SPACING.lg,
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
          }}>{EXAM_UI.LOADING}</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
      }}>
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.xl,
          maxWidth: '400px',
          width: '100%',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: SPACING.lg }}>{ICONS.WARNING}</div>
            <h1 style={{
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.primary.text,
              marginBottom: SPACING.md,
            }}>{EXAM_UI.ERROR}</h1>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.medium,
              marginBottom: SPACING.lg,
            }}>{error || EXAM_UI.NOT_FOUND}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                background: BUTTONS.primary.background,
                color: BUTTONS.primary.text,
                padding: BUTTONS.primary.padding,
                borderRadius: BUTTONS.primary.radius,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.base,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                minHeight: TOUCH_TARGETS.comfortable,
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
              }}
            >
              {EXAM_UI.RETRY}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
      }}>
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.xl,
          maxWidth: '400px',
          width: '100%',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: SPACING.lg }}>{ICONS.WARNING}</div>
            <h1 style={{
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.primary.text,
              marginBottom: SPACING.md,
            }}>{EXAM_UI.ERROR}</h1>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.medium,
              marginBottom: SPACING.lg,
            }}>{EXAM_UI.NOT_FOUND}</p>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = exam.questions[currentQuestion]

  if (!currentQ) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
      }}>
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.xl,
          maxWidth: '400px',
          width: '100%',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: SPACING.lg }}>{ICONS.WARNING}</div>
            <h1 style={{
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.primary.text,
              marginBottom: SPACING.md,
            }}>{EXAM_UI.ERROR}</h1>
            <button
              onClick={() => setCurrentQuestion(0)}
              style={{
                width: '100%',
                background: BUTTONS.primary.background,
                color: BUTTONS.primary.text,
                padding: BUTTONS.primary.padding,
                borderRadius: BUTTONS.primary.radius,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.base,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                minHeight: TOUCH_TARGETS.comfortable,
                cursor: 'pointer',
              }}
            >
              {EXAM_UI.RETRY}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* KaTeX Scripts for LaTeX Rendering */}
      <Script
        src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
        integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
        integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <style>{`
        @media (max-width: 640px) {
          .audio-text-desktop {
            display: none !important;
          }
          .audio-text-mobile {
            display: inline !important;
          }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* ExamGenie Branding */}
      <div style={{
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
      }}>
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACING.md,
        }}>
          {/* Logo and Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.md,
          }}>
            <img
              src="/assets/logo.png"
              alt="ExamGenie Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: RADIUS.md,
              }}
            />
            <h1 style={{
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              color: COLORS.primary.text,
              margin: 0,
            }}>
              ExamGenie
            </h1>
          </div>

          {/* Audio Summary Link - Show only on first question */}
          {mode === 'take' && currentQuestion === 0 && exam.audio_url && (
            <a
              href={exam.audio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="audio-link-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: COLORS.primary.text,
                textDecoration: 'none',
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                transition: 'color 0.2s',
              }}
            >
              <span style={{
                background: '#FF6B35',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px',
              }}>
                UUTTA!
              </span>
              <span className="audio-text-desktop" style={{ whiteSpace: 'nowrap' }}>
                🎧 Kuuntele koealue tästä!
              </span>
              <span className="audio-text-mobile" style={{ whiteSpace: 'nowrap', display: 'none' }}>
                🎧 Kuuntele
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Navigation Dots - Top */}
      {mode === 'take' && (
        <NavigationDots
          total={exam.questions.length}
          current={currentQuestion}
          onDotClick={undefined} // No click navigation for simplicity
        />
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: SPACING.md,
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>
        {mode === 'take' ? (
          <>
            {/* Current Question Card */}
            <div style={{
              background: COLORS.background.primary,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              padding: SPACING.md,
              marginBottom: SPACING.md,
            }}>
              {/* Question Type Badge */}
              <div style={{
                display: 'inline-block',
                background: COLORS.background.secondary,
                color: COLORS.primary.medium,
                padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: RADIUS.sm,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                marginBottom: SPACING.sm,
              }}>
                {currentQuestion + 1} / {exam.total_questions}
              </div>

              <h2 style={{
                fontSize: TYPOGRAPHY.fontSize.xl,
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                color: COLORS.primary.text,
                marginBottom: SPACING.md,
                lineHeight: TYPOGRAPHY.lineHeight.normal,
              }}>{currentQ.question_text}</h2>

              {/* Answer Input */}
              {currentQ.question_type === 'multiple_choice' && currentQ.options ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                  {currentQ.options.map((option, idx) => (
                    <label key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      border: `2px solid ${answers[currentQ.id] === option ? COLORS.primary.dark : COLORS.border.light}`,
                      borderRadius: RADIUS.md,
                      background: answers[currentQ.id] === option ? COLORS.background.secondary : COLORS.background.primary,
                      cursor: 'pointer',
                      minHeight: TOUCH_TARGETS.comfortable,
                      transition: TRANSITIONS.normal,
                    }}>
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={option}
                        checked={answers[currentQ.id] === option}
                        onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: COLORS.primary.dark,
                        }}
                      />
                      <span style={{
                        fontSize: TYPOGRAPHY.fontSize.base,
                        color: COLORS.primary.text,
                        flex: 1,
                      }}>{option}</span>
                    </label>
                  ))}
                </div>
              ) : currentQ.question_type === 'true_false' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                  {[EXAM_UI.TRUE, EXAM_UI.FALSE].map((option) => (
                    <label key={option} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      border: `2px solid ${answers[currentQ.id] === (option === EXAM_UI.TRUE ? 'true' : 'false') ? COLORS.primary.dark : COLORS.border.light}`,
                      borderRadius: RADIUS.md,
                      background: answers[currentQ.id] === (option === EXAM_UI.TRUE ? 'true' : 'false') ? COLORS.background.secondary : COLORS.background.primary,
                      cursor: 'pointer',
                      minHeight: TOUCH_TARGETS.comfortable,
                      transition: TRANSITIONS.normal,
                    }}>
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={option === EXAM_UI.TRUE ? 'true' : 'false'}
                        checked={answers[currentQ.id] === (option === EXAM_UI.TRUE ? 'true' : 'false')}
                        onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: COLORS.primary.dark,
                        }}
                      />
                      <span style={{
                        fontSize: TYPOGRAPHY.fontSize.base,
                        color: COLORS.primary.text,
                        flex: 1,
                      }}>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder={EXAM_UI.YOUR_ANSWER}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: SPACING.md,
                    border: `2px solid ${COLORS.border.medium}`,
                    borderRadius: RADIUS.md,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    color: COLORS.primary.text,
                    fontFamily: TYPOGRAPHY.fontFamily.sans,
                    resize: 'vertical',
                    minHeight: '120px',
                  }}
                />
              )}
            </div>
          </>
        ) : (
          /* Review Mode */
          <div style={{ marginBottom: SPACING.lg }}>
            {exam.latestGrading ? (
              <div style={{
                background: COLORS.background.primary,
                borderRadius: RADIUS.lg,
                boxShadow: SHADOWS.card,
                padding: SPACING.xl,
              }}>
                <div style={{ textAlign: 'center', marginBottom: SPACING.xl }}>
                  <div style={{ fontSize: '64px', marginBottom: SPACING.md }}>
                    {exam.latestGrading.percentage >= 80 ? '🎉' :
                     exam.latestGrading.percentage >= 60 ? '👍' : '📚'}
                  </div>
                  <h2 style={{
                    fontSize: '48px',
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: COLORS.primary.text,
                    marginBottom: SPACING.sm,
                  }}>
                    {exam.latestGrading.final_grade}
                  </h2>
                  <p style={{
                    fontSize: TYPOGRAPHY.fontSize.lg,
                    color: COLORS.primary.medium,
                  }}>
                    {exam.latestGrading.total_points} / {exam.latestGrading.max_total_points} {EXAM_UI.POINTS}
                    ({exam.latestGrading.percentage}%)
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: SPACING.md,
                  textAlign: 'center',
                  borderTop: `1px solid ${COLORS.border.light}`,
                  paddingTop: SPACING.lg,
                }}>
                  <div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize['2xl'],
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.semantic.success,
                    }}>{exam.latestGrading.questions_correct}</div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.primary.medium,
                    }}>{ICONS.CHECK}</div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize['2xl'],
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.semantic.warning,
                    }}>{exam.latestGrading.questions_partial}</div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.primary.medium,
                    }}>~</div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize['2xl'],
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.semantic.error,
                    }}>{exam.latestGrading.questions_incorrect}</div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.primary.medium,
                    }}>{ICONS.CROSS}</div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize['2xl'],
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.primary.text,
                    }}>{exam.latestGrading.questions_count}</div>
                    <div style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.primary.medium,
                    }}>{EXAM_UI.TOTAL}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: COLORS.background.primary,
                borderRadius: RADIUS.lg,
                boxShadow: SHADOWS.card,
                padding: SPACING.xl,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>{ICONS.CHART}</div>
                <h3 style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.primary.text,
                  marginBottom: SPACING.sm,
                }}>{EXAM_UI.NO_RESULTS}</h3>
                <p style={{
                  color: COLORS.primary.medium,
                  marginBottom: SPACING.lg,
                }}>{EXAM_UI.NOT_GRADED_DESC}</p>
                <button
                  onClick={() => setMode('take')}
                  style={{
                    background: BUTTONS.primary.background,
                    color: BUTTONS.primary.text,
                    padding: BUTTONS.primary.padding,
                    borderRadius: BUTTONS.primary.radius,
                    border: 'none',
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  {EXAM_UI.START}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: SPACING.lg,
        }}>
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding: SPACING.xl,
            maxWidth: '400px',
            width: '100%',
          }}>
            <div style={{ textAlign: 'center', marginBottom: SPACING.lg }}>
              <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>{ICONS.WARNING}</div>
              <h3 style={{
                fontSize: TYPOGRAPHY.fontSize.xl,
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.primary.text,
                marginBottom: SPACING.md,
              }}>{EXAM_UI.CONFIRM_SUBMIT}</h3>
              <p style={{
                fontSize: TYPOGRAPHY.fontSize.base,
                color: COLORS.primary.medium,
              }}>
                {EXAM_UI.SUBMIT_WARNING}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  width: '100%',
                  padding: BUTTONS.secondary.padding,
                  border: `2px solid ${COLORS.border.medium}`,
                  borderRadius: BUTTONS.secondary.radius,
                  background: BUTTONS.secondary.background,
                  color: BUTTONS.secondary.text,
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: 'pointer',
                }}
              >
                {EXAM_UI.CANCEL}
              </button>
              <button
                onClick={submitAnswers}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: BUTTONS.primary.padding,
                  border: 'none',
                  borderRadius: BUTTONS.primary.radius,
                  background: COLORS.semantic.success,
                  color: '#FFFFFF',
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                {isSubmitting ? EXAM_UI.SENDING : EXAM_UI.SUBMIT}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation - Only in take mode */}
      {mode === 'take' && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: COLORS.background.primary,
          borderTop: `1px solid ${COLORS.border.light}`,
          boxShadow: SHADOWS.card,
          padding: SPACING.md,
        }}>
          <div style={{
            maxWidth: '640px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: SPACING.sm,
          }}>
            {/* Previous Button */}
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              style={{
                padding: BUTTONS.secondary.padding,
                border: `2px solid ${COLORS.border.medium}`,
                borderRadius: BUTTONS.secondary.radius,
                background: BUTTONS.secondary.background,
                color: BUTTONS.secondary.text,
                fontSize: TYPOGRAPHY.fontSize.base,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                minHeight: TOUCH_TARGETS.comfortable,
                cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                opacity: currentQuestion === 0 ? 0.5 : 1,
              }}
            >
              {ICONS.ARROW_LEFT}
            </button>

            {/* Next/Submit Button */}
            {currentQuestion === (exam.questions?.length || 0) - 1 ? (
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!isAllAnswered()}
                style={{
                  flex: 1,
                  padding: BUTTONS.primary.padding,
                  border: 'none',
                  borderRadius: BUTTONS.primary.radius,
                  background: COLORS.semantic.success,
                  color: '#FFFFFF',
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: !isAllAnswered() ? 'not-allowed' : 'pointer',
                  opacity: !isAllAnswered() ? 0.5 : 1,
                }}
              >
                {EXAM_UI.SUBMIT} {ICONS.CHECK}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min((exam.questions?.length || 0) - 1, currentQuestion + 1))}
                style={{
                  flex: 1,
                  padding: BUTTONS.primary.padding,
                  border: 'none',
                  borderRadius: BUTTONS.primary.radius,
                  background: BUTTONS.primary.background,
                  color: BUTTONS.primary.text,
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: 'pointer',
                }}
              >
                {EXAM_UI.NEXT} {ICONS.ARROW_RIGHT}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
