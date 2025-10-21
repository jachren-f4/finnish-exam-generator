'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamData } from '@/lib/supabase'
import { useTranslation } from '@/i18n'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'
import { getTotalGenieDollars, getExamCompletionStatus, GENIE_DOLLAR_REWARDS, awardExamRetakeDollars } from '@/lib/utils/genie-dollars'
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/utils/onboarding'
import { OnboardingOverlay } from '@/components/exam/OnboardingOverlay'
import { KeyConceptsCard } from '@/components/exam/KeyConceptsCard'

const handleHelpClick = (examId: string, router: any) => {
  router.push(`/exam/${examId}/help`)
}

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

  // Layout mode toggle - change this to 'grid' or 'classic'
  const LAYOUT_MODE = 'classic' as 'grid' | 'classic'

  const [exam, setExam] = useState<ExamMenuState | null>(null)

  // AUTO-DETECT: Use exam's detected language for UI (overrides NEXT_PUBLIC_LOCALE)
  const { t } = useTranslation(exam?.detected_language)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalGenieDollars, setTotalGenieDollars] = useState(0)
  const [wrongQuestionCount, setWrongQuestionCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [rewardStatus, setRewardStatus] = useState({
    audioEarned: false,
    examEarned: false,
    retakeEarned: false,
    audioEligible: true,
    examEligible: true,
    retakeEligible: false,
    audioHoursRemaining: 0,
    examHoursRemaining: 0,
    retakeHoursRemaining: 0,
  })

  useEffect(() => {
    if (examId) {
      fetchExam()
      // Load Genie Dollars and reward status
      setTotalGenieDollars(getTotalGenieDollars())
      setRewardStatus(getExamCompletionStatus(examId))
      // Check if user has seen onboarding for this exam
      if (!hasSeenOnboarding(examId)) {
        setShowOnboarding(true)
      }
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

      // If exam has been completed, fetch attempt history to get wrong question count
      if (examData.hasBeenCompleted) {
        try {
          const attemptsResponse = await fetch(`/api/exam/${examId}/attempts`)
          if (attemptsResponse.ok) {
            const attemptsData = await attemptsResponse.json()
            if (attemptsData.latest_attempt) {
              setWrongQuestionCount(attemptsData.latest_attempt.questions_incorrect || 0)
            }
          }
        } catch (attemptErr) {
          console.error('Failed to fetch attempt history:', attemptErr)
          // Non-critical, continue without wrong question count
        }
      }
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : t('common.loadFailed'))
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

  const dismissOnboarding = () => {
    markOnboardingSeen(examId)
    setShowOnboarding(false)
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

  const isCompleted = exam.hasBeenCompleted && exam.latestGrading
  const hasAudio = exam.audio_url && exam.audio_url.trim() !== ''

  // Localize subject name
  const getLocalizedSubject = (subject: string): string => {
    const subjectKey = subject.toLowerCase()
    // @ts-ignore - dynamic key access for subjects
    return t(`subjects.${subjectKey}`) || subject
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.background.primary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Onboarding Overlay */}
      {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} detectedLanguage={exam?.detected_language} />}

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
              {t('examMenu.title')}
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
              {t('examMenu.genieDollars')}
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
        padding: SPACING.sm,
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Title Card - More Compact */}
        <div style={{
          background: COLORS.background.secondary,
          borderRadius: RADIUS.md,
          padding: `${SPACING.sm} ${SPACING.md}`,
          marginBottom: SPACING.sm,
        }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: '#1a1a1a',
            marginBottom: '2px',
            lineHeight: TYPOGRAPHY.lineHeight.tight,
            textTransform: 'capitalize',
          }}>
            {getLocalizedSubject(exam.subject)}
          </h2>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
            margin: 0,
            lineHeight: TYPOGRAPHY.lineHeight.tight,
          }}>
            {t('examMenu.questionsCount', { count: exam.total_questions })}
          </p>
        </div>

        {/* Conditional Layout Rendering */}
        {LAYOUT_MODE === 'grid' ? (
          /* 3x2 Ultra-Compact Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
          }}>
            {/* Audio Summary Card */}
          {hasAudio && (
            <div
              onClick={handleListenAudio}
              style={{
                background: COLORS.background.primary,
                border: `2px solid ${COLORS.border.light}`,
                borderRadius: '12px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
              }}
            >
            <div style={{
              fontSize: '28px',
              marginBottom: '6px',
            }}>
              🎧
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              marginBottom: '2px',
              color: '#1a1a1a',
            }}>
              {t('examMenu.audioSummary')}
            </div>
            {rewardStatus.audioEligible ? (
              <div style={{
                display: 'inline-block',
                background: '#fef3c7',
                color: '#92400e',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                {t('examMenu.rewardAmount', { amount: GENIE_DOLLAR_REWARDS.AUDIO })}
              </div>
            ) : (
              <div style={{
                display: 'inline-block',
                background: '#d1fae5',
                color: '#065f46',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                ✓
              </div>
            )}
          </div>
          )}

          {/* Exam Card */}
          <div
            onClick={handleStartExam}
            style={{
              background: COLORS.background.primary,
              border: `2px solid ${COLORS.border.light}`,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: TRANSITIONS.normal,
            }}
          >
            <div style={{
              fontSize: '28px',
              marginBottom: '6px',
            }}>
              📝
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              marginBottom: '2px',
              color: '#1a1a1a',
            }}>
              {t('examMenu.exam')}
            </div>
            {rewardStatus.examEligible ? (
              <div style={{
                display: 'inline-block',
                background: '#fef3c7',
                color: '#92400e',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                +{GENIE_DOLLAR_REWARDS.EXAM}
              </div>
            ) : (
              <div style={{
                display: 'inline-block',
                background: '#d1fae5',
                color: '#065f46',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                ✓
              </div>
            )}
          </div>

          {/* Results Card */}
          {isCompleted && (
            <div
              onClick={handleViewResults}
              style={{
                background: COLORS.background.primary,
                border: `2px solid ${COLORS.border.light}`,
                borderRadius: '12px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
              }}
            >
              <div style={{
                fontSize: '28px',
                marginBottom: '6px',
              }}>
                📊
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginBottom: '2px',
                color: '#1a1a1a',
              }}>
                {t('examMenu.results')}
              </div>
              <div style={{
                display: 'inline-block',
                background: '#dbeafe',
                color: '#1e40af',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                {t('examMenu.view')}
              </div>
            </div>
          )}

          {/* Retake Full Exam Card */}
          {isCompleted && (
            <div
              onClick={() => router.push(`/exam/${examId}/take?mode=retake`)}
              style={{
                background: COLORS.background.primary,
                border: `2px solid ${COLORS.border.light}`,
                borderRadius: '12px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
              }}
            >
              <div style={{
                fontSize: '28px',
                marginBottom: '6px',
              }}>
                🔄
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginBottom: '2px',
                color: '#1a1a1a',
              }}>
                {t('examMenu.retake')}
              </div>
              {rewardStatus.retakeEligible ? (
                <div style={{
                  display: 'inline-block',
                  background: '#fb923c',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  marginTop: '4px',
                }}>
                  {t('examMenu.rewardAmount', { amount: GENIE_DOLLAR_REWARDS.EXAM_RETAKE })}
                </div>
              ) : (
                <div style={{
                  display: 'inline-block',
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  marginTop: '4px',
                }}>
                  ✓
                </div>
              )}
            </div>
          )}

          {/* Practice Mistakes Card */}
          {isCompleted && wrongQuestionCount > 0 && (
            <div
              onClick={() => router.push(`/exam/${examId}/take?mode=wrong-only`)}
              style={{
                background: COLORS.background.primary,
                border: `2px solid ${COLORS.border.light}`,
                borderRadius: '12px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
              }}
            >
              <div style={{
                fontSize: '28px',
                marginBottom: '6px',
              }}>
                🎯
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginBottom: '2px',
                color: '#1a1a1a',
              }}>
                {t('examMenu.mistakes')}
              </div>
              <div style={{
                display: 'inline-block',
                background: '#dbeafe',
                color: '#1e40af',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                marginTop: '4px',
              }}>
                {wrongQuestionCount} Q
              </div>
            </div>
          )}

          {/* Help Card */}
          <div
            onClick={() => handleHelpClick(examId, router)}
            style={{
              background: COLORS.background.primary,
              border: `2px solid ${COLORS.border.light}`,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: TRANSITIONS.normal,
            }}
          >
            <div style={{
              fontSize: '28px',
              marginBottom: '6px',
            }}>
              ❓
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              marginBottom: '2px',
              color: '#1a1a1a',
            }}>
              {t('examMenu.help')}
            </div>
            <div style={{
              display: 'inline-block',
              background: '#dbeafe',
              color: '#1e40af',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              marginTop: '4px',
            }}>
              {t('examMenu.learn')}
            </div>
          </div>
          </div>
        ) : (
          /* Classic Vertical Layout */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md,
          }}>
            {/* Audio Summary Card */}
            {hasAudio && (
              <div
                onClick={handleListenAudio}
                style={{
                  background: COLORS.background.primary,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.lg,
                  boxShadow: SHADOWS.card,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  border: `1px solid ${COLORS.border.light}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.md,
                  marginBottom: SPACING.md,
                }}>
                  <div style={{ fontSize: '48px' }}>🎧</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.lg,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.primary.text,
                      margin: 0,
                      marginBottom: SPACING.xs,
                    }}>
                      {t('examMenu.audioSummary')}
                    </h3>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.medium,
                      margin: 0,
                      lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                    }}>
                      {t('examMenu.audioDescription')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleListenAudio}
                  style={{
                    width: '100%',
                    background: COLORS.background.primary,
                    color: COLORS.primary.text,
                    padding: BUTTONS.primary.padding,
                    borderRadius: BUTTONS.primary.radius,
                    border: `2px solid ${COLORS.border.medium}`,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    minHeight: TOUCH_TARGETS.comfortable,
                    cursor: 'pointer',
                    transition: TRANSITIONS.normal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.sm,
                  }}
                >
                  {t('examMenu.listenNow')}
                  {rewardStatus.audioEligible && (
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                    }}>
                      {t('examMenu.rewardAmount', { amount: GENIE_DOLLAR_REWARDS.AUDIO })}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Exam Card */}
            <div
              onClick={handleStartExam}
              style={{
                background: COLORS.background.primary,
                borderRadius: RADIUS.lg,
                padding: SPACING.lg,
                boxShadow: SHADOWS.card,
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
                border: `1px solid ${COLORS.border.light}`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: SPACING.md,
                marginBottom: SPACING.md,
              }}>
                <div style={{ fontSize: '48px' }}>📝</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: TYPOGRAPHY.fontSize.lg,
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: COLORS.primary.text,
                    margin: 0,
                    marginBottom: SPACING.xs,
                  }}>
                    {t('examMenu.exam')}
                  </h3>
                  <p style={{
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: COLORS.primary.medium,
                    margin: 0,
                    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                  }}>
                    {t('examMenu.questionsCount', { count: exam.total_questions })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleStartExam}
                style={{
                  width: '100%',
                  background: COLORS.primary.dark,
                  color: COLORS.background.primary,
                  padding: BUTTONS.primary.padding,
                  borderRadius: BUTTONS.primary.radius,
                  border: 'none',
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.sm,
                }}
              >
                {t('examMenu.startExam')}
                {rewardStatus.examEligible && (
                  <span style={{
                    background: 'rgba(254, 243, 199, 0.3)',
                    color: '#fef3c7',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                  }}>
                    {t('examMenu.rewardAmount', { amount: GENIE_DOLLAR_REWARDS.EXAM })}
                  </span>
                )}
              </button>
            </div>

            {/* Key Concepts Card */}
            {exam.key_concepts && exam.key_concepts.length > 0 && exam.gamification && (
              <KeyConceptsCard
                examId={examId}
                concepts={exam.key_concepts}
                gamification={exam.gamification}
                detectedLanguage={exam.detected_language}
                onComplete={() => {
                  console.log('Key concepts completed! User earned 5 Genie Dollars')
                }}
              />
            )}

            {/* Results Card */}
            {isCompleted && (
              <div
                onClick={handleViewResults}
                style={{
                  background: COLORS.background.primary,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.lg,
                  boxShadow: SHADOWS.card,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  border: `1px solid ${COLORS.border.light}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.md,
                  marginBottom: SPACING.md,
                }}>
                  <div style={{ fontSize: '48px' }}>📊</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.lg,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.primary.text,
                      margin: 0,
                      marginBottom: SPACING.xs,
                    }}>
                      {t('examMenu.results')}
                    </h3>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.medium,
                      margin: 0,
                      lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                    }}>
                      {t('examMenu.resultsDescription')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleViewResults}
                  style={{
                    width: '100%',
                    background: COLORS.background.primary,
                    color: COLORS.primary.text,
                    padding: BUTTONS.primary.padding,
                    borderRadius: BUTTONS.primary.radius,
                    border: `2px solid ${COLORS.border.medium}`,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    minHeight: TOUCH_TARGETS.comfortable,
                    cursor: 'pointer',
                    transition: TRANSITIONS.normal,
                  }}
                >
                  {t('examMenu.viewResults')}
                </button>
              </div>
            )}

            {/* Retake Full Exam Card */}
            {isCompleted && (
              <div
                onClick={() => router.push(`/exam/${examId}/take?mode=retake`)}
                style={{
                  background: COLORS.background.primary,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.lg,
                  boxShadow: SHADOWS.card,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  border: `1px solid ${COLORS.border.light}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.md,
                  marginBottom: SPACING.md,
                }}>
                  <div style={{ fontSize: '48px' }}>🔄</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.lg,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.primary.text,
                      margin: 0,
                      marginBottom: SPACING.xs,
                    }}>
                      {t('examMenu.retake')} {t('examMenu.fullExam')}
                    </h3>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.medium,
                      margin: 0,
                      lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                    }}>
                      {t('examMenu.retakeDescription')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/exam/${examId}/take?mode=retake`)}
                  style={{
                    width: '100%',
                    background: COLORS.background.primary,
                    color: COLORS.primary.text,
                    padding: BUTTONS.primary.padding,
                    borderRadius: BUTTONS.primary.radius,
                    border: `2px solid ${COLORS.border.medium}`,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    minHeight: TOUCH_TARGETS.comfortable,
                    cursor: 'pointer',
                    transition: TRANSITIONS.normal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.sm,
                  }}
                >
                  {t('examMenu.startRetake')}
                  {rewardStatus.retakeEligible && (
                    <span style={{
                      background: '#fb923c',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                    }}>
                      {t('examMenu.rewardAmount', { amount: GENIE_DOLLAR_REWARDS.EXAM_RETAKE })}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Practice Mistakes Card */}
            {isCompleted && wrongQuestionCount > 0 && (
              <div
                onClick={() => router.push(`/exam/${examId}/take?mode=wrong-only`)}
                style={{
                  background: COLORS.background.primary,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.lg,
                  boxShadow: SHADOWS.card,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  border: `1px solid ${COLORS.border.light}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.md,
                  marginBottom: SPACING.md,
                }}>
                  <div style={{ fontSize: '48px' }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.lg,
                      fontWeight: TYPOGRAPHY.fontWeight.bold,
                      color: COLORS.primary.text,
                      margin: 0,
                      marginBottom: SPACING.xs,
                    }}>
                      {t('examMenu.practiceMistakes')}
                    </h3>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.medium,
                      margin: 0,
                      lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                    }}>
                      {t('examMenu.reviewWrongQuestions', { count: wrongQuestionCount })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/exam/${examId}/take?mode=wrong-only`)}
                  style={{
                    width: '100%',
                    background: COLORS.background.primary,
                    color: COLORS.primary.text,
                    padding: BUTTONS.primary.padding,
                    borderRadius: BUTTONS.primary.radius,
                    border: `2px solid ${COLORS.border.medium}`,
                    fontSize: TYPOGRAPHY.fontSize.base,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    minHeight: TOUCH_TARGETS.comfortable,
                    cursor: 'pointer',
                    transition: TRANSITIONS.normal,
                  }}
                >
                  {t('examMenu.practiceNow')}
                </button>
              </div>
            )}

            {/* Help Card */}
            <div
              onClick={() => handleHelpClick(examId, router)}
              style={{
                background: COLORS.background.primary,
                borderRadius: RADIUS.lg,
                padding: SPACING.lg,
                boxShadow: SHADOWS.card,
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
                border: `1px solid ${COLORS.border.light}`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: SPACING.md,
                marginBottom: SPACING.md,
              }}>
                <div style={{ fontSize: '48px' }}>❓</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: TYPOGRAPHY.fontSize.lg,
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: COLORS.primary.text,
                    margin: 0,
                    marginBottom: SPACING.xs,
                  }}>
                    {t('examMenu.helpFaq')}
                  </h3>
                  <p style={{
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: COLORS.primary.medium,
                    margin: 0,
                    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                  }}>
                    {t('examMenu.learn')} {t('examMenu.aboutExamGenie')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleHelpClick(examId, router)}
                style={{
                  width: '100%',
                  background: COLORS.background.secondary,
                  color: COLORS.primary.text,
                  padding: BUTTONS.primary.padding,
                  borderRadius: BUTTONS.primary.radius,
                  border: `2px solid ${COLORS.border.medium}`,
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  minHeight: TOUCH_TARGETS.comfortable,
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                }}
              >
                {t('examMenu.viewHelp')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
