'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamData } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'
import { getTotalGenieDollars, getExamCompletionStatus, GENIE_DOLLAR_REWARDS, formatHoursRemaining } from '@/lib/utils/genie-dollars'

interface ExamMenuState extends ExamData {
  canReuse: boolean
  hasBeenCompleted: boolean
  latestGrading?: any
  audio_url?: string | null
  summary_text?: string | null
}

export default function ExamMenuPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<ExamMenuState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalGenieDollars, setTotalGenieDollars] = useState(0)
  const [rewardStatus, setRewardStatus] = useState({
    audioEarned: false,
    examEarned: false,
    audioEligible: true,
    examEligible: true,
    audioHoursRemaining: 0,
    examHoursRemaining: 0,
  })

  useEffect(() => {
    if (examId) {
      fetchExam()
      // Load Genie Dollars and reward status
      setTotalGenieDollars(getTotalGenieDollars())
      setRewardStatus(getExamCompletionStatus(examId))
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
      const examData = responseData.data || responseData
      setExam(examData)
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : EXAM_UI.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartExam = () => {
    router.push(`/exam/${examId}/take`)
  }

  const handleViewResults = () => {
    router.push(`/grading/${examId}`)
  }

  const handleListenAudio = () => {
    router.push(`/exam/${examId}/audio`)
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

  const isCompleted = exam.hasBeenCompleted && exam.latestGrading
  const hasAudio = exam.audio_url && exam.audio_url.trim() !== ''

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.background.primary,
      display: 'flex',
      flexDirection: 'column',
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
          justifyContent: 'space-between',
          gap: SPACING.md,
        }}>
          {/* Logo Section */}
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

          {/* Genie Dollars Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            background: COLORS.background.secondary,
            padding: `${SPACING.sm} ${SPACING.md}`,
            borderRadius: '20px',
            border: `1px solid ${COLORS.border.light}`,
          }}>
            <span style={{ fontSize: '18px' }}>💵</span>
            <span style={{
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.primary.medium,
              fontWeight: TYPOGRAPHY.fontWeight.medium,
            }}>
              Genie Dollars
            </span>
            <span style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.text,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
            }}>
              {totalGenieDollars}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: SPACING.md,
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Title Card */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.md,
          marginBottom: SPACING.md,
        }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            marginBottom: SPACING.xs,
            lineHeight: TYPOGRAPHY.lineHeight.normal,
          }}>
            {exam.subject}
          </h2>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.base,
            color: COLORS.primary.medium,
            margin: 0,
            lineHeight: TYPOGRAPHY.lineHeight.normal,
          }}>
            Grade {exam.grade} • {exam.total_questions} questions
          </p>
        </div>

        {/* Audio Summary Card */}
        {hasAudio && (
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            marginBottom: SPACING.md,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: SPACING.md,
            }}>
              <div style={{
                fontSize: '32px',
                lineHeight: 1,
              }}>
                🎧
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.primary.text,
                  marginBottom: SPACING.xs,
                  lineHeight: TYPOGRAPHY.lineHeight.normal,
                }}>
                  Audio Summary
                </h3>
                <p style={{
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: COLORS.primary.medium,
                  marginBottom: SPACING.md,
                  lineHeight: TYPOGRAPHY.lineHeight.normal,
                }}>
                  Listen to an overview of the material before taking the exam
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                  <button
                    onClick={handleListenAudio}
                    style={{
                      background: BUTTONS.secondary.background,
                      color: BUTTONS.secondary.text,
                      padding: BUTTONS.secondary.padding,
                      borderRadius: BUTTONS.secondary.radius,
                      border: `2px solid ${COLORS.border.medium}`,
                      fontSize: TYPOGRAPHY.fontSize.base,
                      fontWeight: TYPOGRAPHY.fontWeight.medium,
                      cursor: 'pointer',
                      transition: TRANSITIONS.normal,
                      minHeight: TOUCH_TARGETS.comfortable,
                    }}
                  >
                    Listen Now
                  </button>
                  {rewardStatus.audioEligible ? (
                    <div style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: '12px',
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: SPACING.xs,
                    }}>
                      💵 +{GENIE_DOLLAR_REWARDS.AUDIO}
                    </div>
                  ) : (
                    <div style={{
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: '12px',
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: SPACING.xs,
                    }}>
                      ✓ {rewardStatus.audioHoursRemaining > 0 && `${formatHoursRemaining(rewardStatus.audioHoursRemaining)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exam Card */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.md,
          marginBottom: SPACING.md,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: SPACING.md,
          }}>
            <div style={{
              fontSize: '32px',
              lineHeight: 1,
            }}>
              📝
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: TYPOGRAPHY.fontSize.lg,
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                color: COLORS.primary.text,
                marginBottom: SPACING.xs,
                lineHeight: TYPOGRAPHY.lineHeight.normal,
              }}>
                {isCompleted ? 'Exam Completed' : 'Exam'}
              </h3>
              <p style={{
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: COLORS.primary.medium,
                marginBottom: SPACING.md,
                lineHeight: TYPOGRAPHY.lineHeight.normal,
              }}>
                {isCompleted
                  ? `You've completed this exam. ${exam.canReuse ? 'You can retake it if you wish.' : ''}`
                  : `${exam.total_questions} questions • Estimated time: ${Math.ceil(exam.total_questions * 1.5)} minutes`
                }
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <button
                  onClick={handleStartExam}
                  style={{
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
                  {isCompleted ? (exam.canReuse ? 'Retake Exam' : 'Review Exam') : 'Start Exam'}
                </button>
                {rewardStatus.examEligible ? (
                  <div style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: '12px',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                  }}>
                    💵 +{GENIE_DOLLAR_REWARDS.EXAM}
                  </div>
                ) : (
                  <div style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: '12px',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                  }}>
                    ✓ {rewardStatus.examHoursRemaining > 0 && `${formatHoursRemaining(rewardStatus.examHoursRemaining)}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Card (if completed) */}
        {isCompleted && exam.latestGrading && (
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            marginBottom: SPACING.md,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: SPACING.md,
            }}>
              <div style={{
                fontSize: '32px',
                lineHeight: 1,
              }}>
                📊
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.primary.text,
                  marginBottom: SPACING.xs,
                  lineHeight: TYPOGRAPHY.lineHeight.normal,
                }}>
                  Results
                </h3>
                <p style={{
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: COLORS.primary.medium,
                  marginBottom: SPACING.sm,
                  lineHeight: TYPOGRAPHY.lineHeight.normal,
                }}>
                  Score: {exam.latestGrading.percentage}% ({exam.latestGrading.total_points}/{exam.latestGrading.max_total_points} points)
                </p>
                <p style={{
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: COLORS.primary.medium,
                  marginBottom: SPACING.md,
                  lineHeight: TYPOGRAPHY.lineHeight.normal,
                }}>
                  Grade: {exam.latestGrading.final_grade}
                </p>
                <button
                  onClick={handleViewResults}
                  style={{
                    background: BUTTONS.secondary.background,
                    color: BUTTONS.secondary.text,
                    padding: BUTTONS.secondary.padding,
                    borderRadius: BUTTONS.secondary.radius,
                    border: `2px solid ${COLORS.border.medium}`,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.medium,
                    minHeight: TOUCH_TARGETS.comfortable,
                    cursor: 'pointer',
                    transition: TRANSITIONS.normal,
                  }}
                >
                  View Detailed Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
