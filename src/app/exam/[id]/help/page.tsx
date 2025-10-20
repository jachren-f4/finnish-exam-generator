'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EXAM_UI } from '@/constants/exam-ui'
import { HELP_CONTENT } from '@/constants/help-content'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'

interface HelpPageState {
  subject?: string
  grade?: string
}

interface Section {
  id: string
  title: string
  items: Array<{
    title: string
    content: string
  }>
}

const HELP_SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: HELP_CONTENT.SECTION_GETTING_STARTED,
    items: [
      {
        title: HELP_CONTENT.GETTING_STARTED_WHAT_IS,
        content: HELP_CONTENT.GETTING_STARTED_WHAT_IS_CONTENT,
      },
      {
        title: HELP_CONTENT.GETTING_STARTED_FIRST_EXAM,
        content: HELP_CONTENT.GETTING_STARTED_FIRST_EXAM_CONTENT,
      },
      {
        title: HELP_CONTENT.GETTING_STARTED_RESULTS,
        content: HELP_CONTENT.GETTING_STARTED_RESULTS_CONTENT,
      },
    ],
  },
  {
    id: 'genie-dollars',
    title: HELP_CONTENT.SECTION_GENIE_DOLLARS,
    items: [
      {
        title: HELP_CONTENT.GENIE_DOLLARS_WHAT,
        content: HELP_CONTENT.GENIE_DOLLARS_WHAT_CONTENT,
      },
      {
        title: HELP_CONTENT.GENIE_DOLLARS_HOW_TO_EARN,
        content: HELP_CONTENT.GENIE_DOLLARS_HOW_TO_EARN_CONTENT,
      },
      {
        title: HELP_CONTENT.GENIE_DOLLARS_COOLDOWN,
        content: HELP_CONTENT.GENIE_DOLLARS_COOLDOWN_CONTENT,
      },
      {
        title: HELP_CONTENT.GENIE_DOLLARS_AUDIO_REQUIREMENT,
        content: HELP_CONTENT.GENIE_DOLLARS_AUDIO_REQUIREMENT_CONTENT,
      },
    ],
  },
  {
    id: 'features',
    title: HELP_CONTENT.SECTION_FEATURES,
    items: [
      {
        title: HELP_CONTENT.FEATURES_AUDIO,
        content: HELP_CONTENT.FEATURES_AUDIO_CONTENT,
      },
      {
        title: HELP_CONTENT.FEATURES_TAKE_EXAM,
        content: HELP_CONTENT.FEATURES_TAKE_EXAM_CONTENT,
      },
      {
        title: HELP_CONTENT.FEATURES_VIEW_RESULTS,
        content: HELP_CONTENT.FEATURES_VIEW_RESULTS_CONTENT,
      },
      {
        title: HELP_CONTENT.FEATURES_RETAKE_EXAM,
        content: HELP_CONTENT.FEATURES_RETAKE_EXAM_CONTENT,
      },
      {
        title: HELP_CONTENT.FEATURES_PRACTICE_MISTAKES,
        content: HELP_CONTENT.FEATURES_PRACTICE_MISTAKES_CONTENT,
      },
    ],
  },
  {
    id: 'tips',
    title: HELP_CONTENT.SECTION_TIPS,
    items: [
      {
        title: HELP_CONTENT.TIPS_AUDIO_FIRST,
        content: HELP_CONTENT.TIPS_AUDIO_FIRST_CONTENT,
      },
      {
        title: HELP_CONTENT.TIPS_PRACTICE_MISTAKES,
        content: HELP_CONTENT.TIPS_PRACTICE_MISTAKES_CONTENT,
      },
      {
        title: HELP_CONTENT.TIPS_STORY_MODE_NAV,
        content: HELP_CONTENT.TIPS_STORY_MODE_NAV_CONTENT,
      },
      {
        title: HELP_CONTENT.TIPS_SPACED_REPETITION,
        content: HELP_CONTENT.TIPS_SPACED_REPETITION_CONTENT,
      },
    ],
  },
  {
    id: 'faq',
    title: HELP_CONTENT.SECTION_FAQ,
    items: [
      {
        title: HELP_CONTENT.FAQ_NO_REWARD,
        content: HELP_CONTENT.FAQ_NO_REWARD_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_RETAKE_VS_PRACTICE,
        content: HELP_CONTENT.FAQ_RETAKE_VS_PRACTICE_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_GRADING,
        content: HELP_CONTENT.FAQ_GRADING_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_PARTIAL_CREDIT,
        content: HELP_CONTENT.FAQ_PARTIAL_CREDIT_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_RESULTS_COLORS,
        content: HELP_CONTENT.FAQ_RESULTS_COLORS_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_RETAKE_AFTER_HOURS,
        content: HELP_CONTENT.FAQ_RETAKE_AFTER_HOURS_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_QUESTIONS_SAME,
        content: HELP_CONTENT.FAQ_QUESTIONS_SAME_CONTENT,
      },
      {
        title: HELP_CONTENT.FAQ_LEADERBOARD,
        content: HELP_CONTENT.FAQ_LEADERBOARD_CONTENT,
      },
    ],
  },
]

export default function HelpPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<HelpPageState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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
        throw new Error(EXAM_UI.LOAD_FAILED)
      }

      const responseData = await response.json()
      const examData = responseData.data || responseData
      setExam(examData)
    } catch (err) {
      console.error('Error fetching exam:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleBackToMenu = () => {
    router.push(`/exam/${examId}`)
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: COLORS.background.primary,
        }}
      >
        <p style={{ color: COLORS.primary.medium, fontSize: TYPOGRAPHY.fontSize.lg }}>
          {EXAM_UI.LOADING}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.background.secondary,
        padding: SPACING.md,
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          paddingBottom: SPACING.xl,
        }}
      >
        {/* Back button */}
        <button
          onClick={handleBackToMenu}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.primary.dark,
            fontSize: TYPOGRAPHY.fontSize.base,
            fontWeight: TYPOGRAPHY.fontWeight.medium,
            cursor: 'pointer',
            padding: `${SPACING.md} 0`,
            transition: TRANSITIONS.normal,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
          }}
          onMouseOver={(e) => {
            (e.target as HTMLElement).style.opacity = '0.7'
          }}
          onMouseOut={(e) => {
            (e.target as HTMLElement).style.opacity = '1'
          }}
        >
          ← {HELP_CONTENT.BACK_TO_MENU}
        </button>

        {/* Page title */}
        <h1
          style={{
            fontSize: TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.primary.dark,
            marginBottom: SPACING.sm,
            marginTop: SPACING.lg,
          }}
        >
          {HELP_CONTENT.PAGE_TITLE}
        </h1>

        {/* Exam context */}
        {exam && (
          <p
            style={{
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.primary.medium,
              marginBottom: SPACING.lg,
            }}
          >
            {exam.subject && `Subject: ${exam.subject}`}
            {exam.subject && exam.grade && ' • '}
            {exam.grade && `Grade ${exam.grade}`}
          </p>
        )}
      </div>

      {/* Help Sections */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          paddingBottom: SPACING.xl,
        }}
      >
        {HELP_SECTIONS.map((section) => (
          <div
            key={section.id}
            style={{
              marginBottom: SPACING.xl,
            }}
          >
            {/* Section header */}
            <h2
              style={{
                fontSize: TYPOGRAPHY.fontSize.lg,
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.primary.dark,
                marginBottom: SPACING.md,
                paddingBottom: SPACING.md,
                borderBottom: `2px solid ${COLORS.border.light}`,
              }}
            >
              {section.title}
            </h2>

            {/* Help items in section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.md,
              }}
            >
              {section.items.map((item, idx) => {
                const itemId = `${section.id}-${idx}`
                const isExpanded = expandedItems.has(itemId)

                return (
                  <div
                    key={itemId}
                    style={{
                      backgroundColor: COLORS.background.primary,
                      borderRadius: RADIUS.md,
                      border: `1px solid ${COLORS.border.light}`,
                      overflow: 'hidden',
                      transition: TRANSITIONS.normal,
                    }}
                  >
                    {/* Question/Title */}
                    <button
                      onClick={() => toggleItem(itemId)}
                      style={{
                        width: '100%',
                        padding: SPACING.md,
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: SPACING.md,
                        fontSize: TYPOGRAPHY.fontSize.base,
                        fontWeight: TYPOGRAPHY.fontWeight.semibold,
                        color: COLORS.primary.dark,
                        transition: TRANSITIONS.normal,
                        minHeight: TOUCH_TARGETS.comfortable,
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget).style.backgroundColor = COLORS.background.secondary
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget).style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>{item.title}</span>
                      <span
                        style={{
                          fontSize: TYPOGRAPHY.fontSize.lg,
                          transition: TRANSITIONS.normal,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Answer/Content */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: SPACING.md,
                          paddingTop: 0,
                          borderTop: `1px solid ${COLORS.border.light}`,
                          backgroundColor: COLORS.background.secondary,
                          fontSize: TYPOGRAPHY.fontSize.sm,
                          color: COLORS.primary.medium,
                          lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.content}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer spacing */}
      <div style={{ paddingBottom: SPACING.xl }} />
    </div>
  )
}
