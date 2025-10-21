'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { ExamData, StudentAnswer } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { useTranslation } from '@/i18n'
import { ICONS } from '@/constants/exam-icons'
import { NavigationDots } from '@/components/exam/NavigationDots'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'
import { awardExamDollars, awardExamRetakeDollars } from '@/lib/utils/genie-dollars'

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
  const searchParams = useSearchParams()
  const examId = params?.id as string
  const examMode = searchParams.get('mode') || 'normal' // 'normal', 'retake', or 'wrong-only'

  const [exam, setExam] = useState<ExamState | null>(null)

  // AUTO-DETECT: Use exam's detected language for UI (overrides NEXT_PUBLIC_LOCALE)
  const { t } = useTranslation(exam?.detected_language)
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<{[questionId: string]: string}>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mode, setMode] = useState<'take' | 'review'>('take')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [previousAttempt, setPreviousAttempt] = useState<any | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)

  useEffect(() => {
    if (examId) {
      fetchExam()
    }
  }, [examId])

  // Render LaTeX math notation with KaTeX
  // Only render after exam data has loaded and scripts are ready
  useEffect(() => {
    // Don't try to render if we're still loading or have no exam data
    if (isLoading || !exam) return

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
          console.log('[KaTeX] Rendered math for question', currentQuestion + 1)
        } catch (error) {
          console.warn('KaTeX rendering failed:', error)
        }
      } else {
        // Scripts not loaded yet, retry after delay
        console.log('[KaTeX] Scripts not ready, retrying in 50ms...')
        const timer = setTimeout(renderMath, 50)
        return () => clearTimeout(timer)
      }
    }

    // Small delay to ensure DOM has updated with question content
    const timer = setTimeout(renderMath, 10)
    return () => clearTimeout(timer)
  }, [isLoading, exam, currentQuestion])  // Trigger when exam loads or question changes

  const fetchExam = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/exam/${examId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('common.loadFailed'))
      }

      const responseData = await response.json()
      const examData = responseData.data || responseData
      setExam(examData)

      // Force 'take' mode if retaking or practicing wrong answers
      if (examMode === 'retake' || examMode === 'wrong-only') {
        setMode('take')

        // Fetch previous attempt grading for comparison
        const gradingResponse = await fetch(`/api/exam/${examId}/grade`)
        if (gradingResponse.ok) {
          const gradingData = await gradingResponse.json()
          if (gradingData.success && gradingData.data) {
            setPreviousAttempt(gradingData.data)
          }
        }

        // Get next attempt number for retakes
        if (examMode === 'retake') {
          const attemptResponse = await fetch(`/api/exam/${examId}/next-attempt`)
          if (attemptResponse.ok) {
            const attemptData = await attemptResponse.json()
            setAttemptNumber(attemptData.attemptNumber || 1)
          }
        }

        // Filter questions for wrong-only mode
        if (examMode === 'wrong-only' && examData.questions) {
          const wrongResponse = await fetch(`/api/exam/${examId}/wrong-questions`)
          if (wrongResponse.ok) {
            const wrongData = await wrongResponse.json()
            const wrongIds = new Set(wrongData.wrongQuestionIds || [])
            const wrongQuestions = examData.questions.filter((q: any) => wrongIds.has(q.id))
            setFilteredQuestions(wrongQuestions)
          } else {
            setFilteredQuestions(examData.questions)
          }
        } else {
          setFilteredQuestions(examData.questions || [])
        }
      } else if (examData.hasBeenCompleted && examData.latestGrading) {
        setMode('review')
        setFilteredQuestions(examData.questions || [])
      } else {
        setMode('take')
        setFilteredQuestions(examData.questions || [])
      }
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : t('common.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    console.log(`[Exam] Answer changed for question ${questionId}:`, answer)
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      }
      console.log('[Exam] All answers:', Object.keys(newAnswers).length, 'answered')
      return newAnswers
    })
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

      // Award Genie Dollars for completing exam
      awardExamDollars(examId)

      // Redirect to grading page to show results immediately
      router.push(`/grading/${examId}`)

    } catch (error) {
      console.error('Error submitting answers:', error)
      setError(error instanceof Error ? error.message : 'Answer submission failed')
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  // Get the active questions list (filtered for wrong-only mode, or all questions)
  const getActiveQuestions = () => {
    if (examMode === 'wrong-only' && filteredQuestions.length > 0) {
      return filteredQuestions
    }
    return exam?.questions || []
  }

  const isAllAnswered = () => {
    const activeQuestions = getActiveQuestions()
    if (!activeQuestions || activeQuestions.length === 0) return false
    const allAnswered = activeQuestions.every(q => answers[q.id]?.trim())
    console.log('[Exam] isAllAnswered:', allAnswered, 'Total:', activeQuestions.length, 'Answered:', Object.keys(answers).length)
    return allAnswered
  }

  const getProgress = () => {
    const activeQuestions = getActiveQuestions()
    if (activeQuestions.length === 0) return 0
    const answeredCount = activeQuestions.filter(q => answers[q.id]?.trim()).length
    return Math.round((answeredCount / activeQuestions.length) * 100)
  }

  const getAnsweredIndices = (): Set<number> => {
    const activeQuestions = getActiveQuestions()
    const answeredSet = new Set<number>()
    activeQuestions.forEach((q, index) => {
      if (answers[q.id]?.trim()) {
        answeredSet.add(index)
      }
    })
    return answeredSet
  }

  // Get previous answer for a specific question
  const getPreviousAnswer = (questionId: string) => {
    if (!previousAttempt || !previousAttempt.questions) return null
    return previousAttempt.questions.find((q: any) => q.id === questionId)
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
          }}>{t('common.loading')}</p>
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
            }}>{t('common.error')}</h1>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.medium,
              marginBottom: SPACING.lg,
            }}>{error || t('common.notFound')}</p>
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
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeQuestions = getActiveQuestions()

  if (!activeQuestions || activeQuestions.length === 0) {
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
            }}>{t('common.error')}</h1>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.medium,
              marginBottom: SPACING.lg,
            }}>{examMode === 'wrong-only' ? 'No wrong answers to practice!' : t('common.notFound')}</p>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = activeQuestions[currentQuestion]

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
            }}>{t('common.error')}</h1>
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
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: (mode === 'take' && (examMode === 'retake' || examMode === 'wrong-only') && getPreviousAnswer(currentQ.id)) ? '60px' : '0',
      }}>
      {/* Header */}
      <div style={{
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
      }}>
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          <button
            onClick={() => router.push(`/exam/${examId}`)}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.primary.text,
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              cursor: 'pointer',
              padding: SPACING.xs,
              display: 'flex',
              alignItems: 'center',
              minHeight: TOUCH_TARGETS.comfortable,
            }}
            aria-label="Back to menu"
          >
            {ICONS.ARROW_LEFT}
          </button>
          <h1 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            margin: 0,
          }}>
            Take exam
          </h1>
        </div>
      </div>

      {/* Navigation Dots - Top */}
      {mode === 'take' && (
        <NavigationDots
          total={activeQuestions.length}
          current={currentQuestion}
          onDotClick={undefined} // No click navigation for simplicity
          answeredIndices={getAnsweredIndices()}
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
                {currentQuestion + 1} / {activeQuestions.length}
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
                  {currentQ.options.map((option: string, idx: number) => (
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
                  {[t('examTaking.true'), t('examTaking.false')].map((option) => (
                    <label key={option} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      border: `2px solid ${answers[currentQ.id] === (option === t('examTaking.true') ? 'true' : 'false') ? COLORS.primary.dark : COLORS.border.light}`,
                      borderRadius: RADIUS.md,
                      background: answers[currentQ.id] === (option === t('examTaking.true') ? 'true' : 'false') ? COLORS.background.secondary : COLORS.background.primary,
                      cursor: 'pointer',
                      minHeight: TOUCH_TARGETS.comfortable,
                      transition: TRANSITIONS.normal,
                    }}>
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={option === t('examTaking.true') ? 'true' : 'false'}
                        checked={answers[currentQ.id] === (option === t('examTaking.true') ? 'true' : 'false')}
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
                  placeholder={t('examTaking.yourAnswer')}
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
                    {exam.latestGrading.total_points} / {exam.latestGrading.max_total_points} {t('examGrading.points', { points: '' })}
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
                    }}>{t('examGrading.total')}</div>
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
                }}>{t('examTaking.noResults')}</h3>
                <p style={{
                  color: COLORS.primary.medium,
                  marginBottom: SPACING.lg,
                }}>{t('examTaking.notGradedDesc')}</p>
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
                  {t('examTaking.start')}
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
              }}>{t('examTaking.confirmSubmit')}</h3>
              <p style={{
                fontSize: TYPOGRAPHY.fontSize.base,
                color: COLORS.primary.medium,
              }}>
                {t('examTaking.submitWarning')}
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
                {t('common.cancel')}
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
                {isSubmitting ? t('examTaking.sending') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar - Show previous answer (Variant 6) */}
      {mode === 'take' && (examMode === 'retake' || examMode === 'wrong-only') && getPreviousAnswer(currentQ.id) && (
        <div
          onClick={() => setShowBottomSheet(true)}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: COLORS.semantic.success,
            color: '#FFFFFF',
            padding: `${SPACING.sm} ${SPACING.md}`,
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: SHADOWS.card,
            zIndex: 100,
          }}
        >
          Previous: {getPreviousAnswer(currentQ.id)?.points_awarded === getPreviousAnswer(currentQ.id)?.max_points ? '✓' : '✗'} {getPreviousAnswer(currentQ.id)?.points_awarded}/{getPreviousAnswer(currentQ.id)?.max_points} points • Tap to view
        </div>
      )}

      {/* Overlay */}
      {showBottomSheet && (
        <div
          onClick={() => setShowBottomSheet(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 150,
          }}
        />
      )}

      {/* Bottom Sheet */}
      {(examMode === 'retake' || examMode === 'wrong-only') && getPreviousAnswer(currentQ.id) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: COLORS.background.primary,
          borderRadius: `${RADIUS.lg} ${RADIUS.lg} 0 0`,
          padding: SPACING.lg,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
          transform: showBottomSheet ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 200,
          maxWidth: '640px',
          margin: '0 auto',
        }}>
          {/* Sheet Handle */}
          <div style={{
            width: '40px',
            height: '4px',
            background: COLORS.border.medium,
            borderRadius: RADIUS.full,
            margin: `0 auto ${SPACING.md}`,
          }} />

          <h3 style={{
            marginBottom: SPACING.sm,
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
          }}>
            Previous Answer {getPreviousAnswer(currentQ.id)?.points_awarded === getPreviousAnswer(currentQ.id)?.max_points ? '✓' : '✗'}
          </h3>

          <div style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
            marginBottom: SPACING.sm,
          }}>
            <p style={{ marginBottom: SPACING.xs }}><strong>You answered:</strong></p>
            <p style={{
              marginBottom: SPACING.sm,
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.text,
              fontWeight: TYPOGRAPHY.fontWeight.medium,
            }}>
              {getPreviousAnswer(currentQ.id)?.student_answer || 'No answer'}
            </p>
            <p style={{
              color: getPreviousAnswer(currentQ.id)?.points_awarded === getPreviousAnswer(currentQ.id)?.max_points
                ? COLORS.semantic.success
                : COLORS.semantic.error,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              marginBottom: SPACING.xs,
            }}>
              {getPreviousAnswer(currentQ.id)?.points_awarded}/{getPreviousAnswer(currentQ.id)?.max_points} points
            </p>
            {getPreviousAnswer(currentQ.id)?.feedback && (
              <p style={{ color: COLORS.primary.medium }}>
                {getPreviousAnswer(currentQ.id)?.feedback}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowBottomSheet(false)}
            style={{
              background: COLORS.primary.dark,
              color: '#FFFFFF',
              border: 'none',
              padding: `${SPACING.sm} ${SPACING.md}`,
              borderRadius: RADIUS.md,
              width: '100%',
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              cursor: 'pointer',
              minHeight: TOUCH_TARGETS.comfortable,
            }}
          >
            Close
          </button>
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
            {currentQuestion === activeQuestions.length - 1 ? (
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.xs,
                }}
              >
                {t('common.submit')} {ICONS.CHECK}
                {!isAllAnswered() && (
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, opacity: 0.9 }}>
                    ({getAnsweredIndices().size}/{activeQuestions.length})
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(activeQuestions.length - 1, currentQuestion + 1))}
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
                {t('common.next')} {ICONS.ARROW_RIGHT}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
