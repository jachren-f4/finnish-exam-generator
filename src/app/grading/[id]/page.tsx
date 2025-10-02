'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { GradingResult } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'

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
      const gradingData = responseData.data || responseData
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
    if (gradeNum >= 9) return COLORS.semantic.success
    if (gradeNum >= 7) return COLORS.semantic.info
    if (gradeNum >= 5) return COLORS.semantic.warning
    return COLORS.semantic.error
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

  if (error || !grading) {
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
            }}>{error || EXAM_UI.NO_RESULTS}</p>
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
    <div style={{
      minHeight: '100vh',
      background: COLORS.background.primary,
      padding: SPACING.lg,
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>

        {/* ExamGenie Branding */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          marginBottom: SPACING.lg,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: COLORS.primary.dark,
            borderRadius: RADIUS.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            🎓
          </div>
          <h1 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            margin: 0,
          }}>
            ExamGenie
          </h1>
        </div>

        {/* Grade Summary */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.xl,
          marginBottom: SPACING.lg,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: SPACING.md }}>
              {parseInt(grading.final_grade) >= 9 ? '🎉' :
               parseInt(grading.final_grade) >= 7 ? '👍' :
               parseInt(grading.final_grade) >= 5 ? '📚' : '💪'}
            </div>
            <div style={{
              fontSize: '72px',
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: getGradeColor(grading.final_grade),
              marginBottom: SPACING.sm,
            }}>
              {grading.final_grade}
            </div>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              color: COLORS.primary.medium,
              marginBottom: SPACING.xs,
            }}>
              {grading.total_points} / {grading.max_total_points} {EXAM_UI.POINTS}
            </p>
            <p style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.medium,
            }}>
              ({grading.percentage}%)
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: SPACING.md,
          marginBottom: SPACING.lg,
        }}>
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.md,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize['2xl'],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.semantic.success,
            }}>{grading.questions_correct}</div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: COLORS.primary.medium,
              marginTop: SPACING.xs,
            }}>{ICONS.CHECK}</div>
          </div>
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.md,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize['2xl'],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.semantic.warning,
            }}>{grading.questions_partial}</div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: COLORS.primary.medium,
              marginTop: SPACING.xs,
            }}>~</div>
          </div>
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.md,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize['2xl'],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.semantic.error,
            }}>{grading.questions_incorrect}</div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: COLORS.primary.medium,
              marginTop: SPACING.xs,
            }}>{ICONS.CROSS}</div>
          </div>
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.md,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize['2xl'],
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.primary.text,
            }}>{grading.questions_count}</div>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: COLORS.primary.medium,
              marginTop: SPACING.xs,
            }}>{EXAM_UI.TOTAL}</div>
          </div>
        </div>

        {/* Questions Toggle */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
        }}>
          <button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minHeight: TOUCH_TARGETS.comfortable,
              padding: 0,
            }}
          >
            <h2 style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              color: COLORS.primary.text,
            }}>
              {EXAM_UI.ANSWERS_BY_QUESTION} ({grading.questions_count})
            </h2>
            <span style={{
              transform: showAllQuestions ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: TRANSITIONS.normal,
              fontSize: TYPOGRAPHY.fontSize.xl,
            }}>
              ▼
            </span>
          </button>

          {showAllQuestions && (
            <div style={{ marginTop: SPACING.lg, display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              {(grading.questions || []).map((question, index) => (
                <div key={question.id} style={{
                  border: `2px solid ${COLORS.border.light}`,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: SPACING.md,
                    gap: SPACING.md,
                  }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.base,
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      color: COLORS.primary.text,
                      flex: 1,
                    }}>
                      {index + 1}. {question.question_text}
                    </h3>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: TYPOGRAPHY.fontSize.lg,
                        fontWeight: TYPOGRAPHY.fontWeight.bold,
                        color: question.percentage === 100 ? COLORS.semantic.success :
                          question.percentage > 0 ? COLORS.semantic.warning : COLORS.semantic.error
                      }}>
                        {question.points_awarded}/{question.max_points}
                      </span>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        color: COLORS.primary.medium,
                      }}>{question.percentage}%</p>
                    </div>
                  </div>

                  {question.options && (
                    <div style={{ marginBottom: SPACING.md }}>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        color: COLORS.primary.medium,
                        marginBottom: SPACING.xs,
                      }}>{EXAM_UI.OPTIONS}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs }}>
                        {question.options.map((option, idx) => (
                          <span key={idx} style={{
                            fontSize: TYPOGRAPHY.fontSize.sm,
                            background: COLORS.background.secondary,
                            padding: `${SPACING.xs} ${SPACING.sm}`,
                            borderRadius: RADIUS.sm,
                            color: COLORS.primary.text,
                          }}>
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md, marginBottom: SPACING.md }}>
                    <div>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        color: COLORS.primary.medium,
                        marginBottom: SPACING.xs,
                      }}>{EXAM_UI.YOUR_ANSWER_LABEL}</p>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.base,
                        color: COLORS.primary.text,
                        background: '#EBF5FF',
                        padding: SPACING.md,
                        borderRadius: RADIUS.sm,
                      }}>
                        {question.student_answer || EXAM_UI.YOUR_ANSWER}
                      </p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        color: COLORS.primary.medium,
                        marginBottom: SPACING.xs,
                      }}>{EXAM_UI.CORRECT_ANSWER_LABEL}</p>
                      <p style={{
                        fontSize: TYPOGRAPHY.fontSize.base,
                        color: COLORS.primary.text,
                        background: '#E8F5E9',
                        padding: SPACING.md,
                        borderRadius: RADIUS.sm,
                      }}>
                        {question.expected_answer}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    padding: SPACING.md,
                    borderRadius: RADIUS.sm,
                    background: question.percentage === 100 ? '#E8F5E9' :
                      question.percentage > 0 ? '#FFF9C4' : '#FFEBEE',
                    borderLeft: `4px solid ${question.percentage === 100 ? COLORS.semantic.success :
                      question.percentage > 0 ? COLORS.semantic.warning : COLORS.semantic.error}`,
                  }}>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.text,
                      marginBottom: SPACING.sm,
                    }}>{question.feedback}</p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: SPACING.xs,
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.primary.medium,
                    }}>
                      <span>{EXAM_UI.GRADING_METHOD} {question.grading_method === 'gemini' ? `🤖 ${EXAM_UI.AI_GRADING}` : `📏 ${EXAM_UI.RULE_BASED}`}</span>
                      <span>{EXAM_UI.QUESTION}: {question.question_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          <button
            onClick={() => window.print()}
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
            🖨️ {EXAM_UI.PRINT_RESULTS}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              width: '100%',
              background: BUTTONS.secondary.background,
              color: BUTTONS.secondary.text,
              padding: BUTTONS.secondary.padding,
              borderRadius: BUTTONS.secondary.radius,
              border: `2px solid ${COLORS.border.medium}`,
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.medium,
              minHeight: TOUCH_TARGETS.comfortable,
              cursor: 'pointer',
            }}
          >
            📝 {EXAM_UI.NEW_EXAM}
          </button>
        </div>
      </div>
    </div>
  )
}
