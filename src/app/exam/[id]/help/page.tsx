'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n'
import { ICONS } from '@/constants/exam-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'

export default function HelpPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const { t } = useTranslation(detectedLanguage)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    // Fetch exam language for proper UI localization
    const fetchExamLanguage = async () => {
      try {
        const response = await fetch(`/api/exam/${examId}`)
        if (response.ok) {
          const data = await response.json()
          const examData = data.data || data
          setDetectedLanguage(examData.detected_language || null)
        }
      } catch (err) {
        console.error('Failed to fetch exam language:', err)
      }
    }

    if (examId) {
      fetchExamLanguage()
    }
  }, [examId])

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const helpSections = [
    {
      id: 'getting-started',
      title: t('help.sectionGettingStarted'),
      items: [
        { title: t('help.gettingStartedWhatIs'), content: t('help.gettingStartedWhatIsContent') },
        { title: t('help.gettingStartedFirstExam'), content: t('help.gettingStartedFirstExamContent') },
        { title: t('help.gettingStartedResults'), content: t('help.gettingStartedResultsContent') },
      ]
    },
    {
      id: 'genie-dollars',
      title: t('help.sectionGenieDollars'),
      items: [
        { title: t('help.genieDollarsWhat'), content: t('help.genieDollarsWhatContent') },
        { title: t('help.genieDollarsHowToEarn'), content: t('help.genieDollarsHowToEarnContent') },
        { title: t('help.genieDollarsCooldown'), content: t('help.genieDollarsCooldownContent') },
        { title: t('help.genieDollarsAudioRequirement'), content: t('help.genieDollarsAudioRequirementContent') },
      ]
    },
    {
      id: 'features',
      title: t('help.sectionFeatures'),
      items: [
        { title: t('help.featuresAudio'), content: t('help.featuresAudioContent') },
        { title: t('help.featuresTakeExam'), content: t('help.featuresTakeExamContent') },
        { title: t('help.featuresViewResults'), content: t('help.featuresViewResultsContent') },
        { title: t('help.featuresRetakeExam'), content: t('help.featuresRetakeExamContent') },
        { title: t('help.featuresPracticeMistakes'), content: t('help.featuresPracticeMistakesContent') },
      ]
    },
    {
      id: 'tips',
      title: t('help.sectionTips'),
      items: [
        { title: t('help.tipsAudioFirst'), content: t('help.tipsAudioFirstContent') },
        { title: t('help.tipsPracticeMistakes'), content: t('help.tipsPracticeMistakesContent') },
        { title: t('help.tipsStoryModeNav'), content: t('help.tipsStoryModeNavContent') },
        { title: t('help.tipsSpacedRepetition'), content: t('help.tipsSpacedRepetitionContent') },
      ]
    },
    {
      id: 'faq',
      title: t('help.sectionFaq'),
      items: [
        { title: t('help.faqNoReward'), content: t('help.faqNoRewardContent') },
        { title: t('help.faqRetakeVsPractice'), content: t('help.faqRetakeVsPracticeContent') },
        { title: t('help.faqGrading'), content: t('help.faqGradingContent') },
        { title: t('help.faqPartialCredit'), content: t('help.faqPartialCreditContent') },
        { title: t('help.faqResultsColors'), content: t('help.faqResultsColorsContent') },
        { title: t('help.faqRetakeAfterHours'), content: t('help.faqRetakeAfterHoursContent') },
        { title: t('help.faqQuestionsSame'), content: t('help.faqQuestionsSameContent') },
        { title: t('help.faqLeaderboard'), content: t('help.faqLeaderboardContent') },
      ]
    },
  ]

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
            {t('help.pageTitle')}
          </h1>
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
        {helpSections.map((section) => (
          <div key={section.id} style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            marginBottom: SPACING.md,
          }}>
            <button
              onClick={() => toggleSection(section.id)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: SPACING.sm,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: TOUCH_TARGETS.comfortable,
              }}
            >
              <h2 style={{
                fontSize: TYPOGRAPHY.fontSize.lg,
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.primary.text,
                margin: 0,
              }}>
                {section.title}
              </h2>
              <span style={{
                transform: expandedSection === section.id ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: TRANSITIONS.normal,
                fontSize: TYPOGRAPHY.fontSize.xl,
                color: COLORS.primary.medium,
              }}>
                ▼
              </span>
            </button>

            {expandedSection === section.id && (
              <div style={{
                marginTop: SPACING.md,
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.md,
              }}>
                {section.items.map((item, index) => (
                  <div key={index} style={{
                    padding: SPACING.md,
                    background: COLORS.background.secondary,
                    borderRadius: RADIUS.md,
                    borderLeft: `4px solid ${COLORS.primary.dark}`,
                  }}>
                    <h3 style={{
                      fontSize: TYPOGRAPHY.fontSize.base,
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      color: COLORS.primary.text,
                      marginBottom: SPACING.sm,
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: COLORS.primary.medium,
                      lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Back Button */}
        <button
          onClick={() => router.push(`/exam/${examId}`)}
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
            marginTop: SPACING.md,
          }}
        >
          {ICONS.ARROW_LEFT} {t('help.backToMenu')}
        </button>
      </div>
    </div>
  )
}
