'use client'

import { useState, useEffect } from 'react'
import { KeyConcept, GamificationData } from '@/lib/supabase'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/constants/design-tokens'
import { useTranslation } from '@/i18n'
import { awardKeyConceptsDollars, GENIE_DOLLAR_REWARDS } from '@/lib/utils/genie-dollars'

interface KeyConceptsCardProps {
  examId: string
  concepts: KeyConcept[]
  gamification: GamificationData
  detectedLanguage?: string | null
  onComplete?: () => void
}

export function KeyConceptsCard({ examId, concepts, gamification, detectedLanguage, onComplete }: KeyConceptsCardProps) {
  const { t } = useTranslation(detectedLanguage)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedConcepts, setCompletedConcepts] = useState<Set<number>>(new Set())
  const [showMiniGame, setShowMiniGame] = useState(false)
  const [allConceptsCompleted, setAllConceptsCompleted] = useState(false)
  const [dollarsEarned, setDollarsEarned] = useState(0)

  const storageKey = `examgenie_concepts_${examId}`

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const data = JSON.parse(saved)
      setCompletedConcepts(new Set(data.completed || []))
      setCurrentIndex(data.currentIndex || 0)
      setAllConceptsCompleted(data.allCompleted || false)
    }
  }, [storageKey])

  // Save progress to localStorage
  const saveProgress = (completed: Set<number>, index: number, allCompleted: boolean) => {
    localStorage.setItem(storageKey, JSON.stringify({
      completed: Array.from(completed),
      currentIndex: index,
      allCompleted: allCompleted
    }))
  }

  const currentConcept = concepts[currentIndex]

  const handleNext = () => {
    const newCompleted = new Set(completedConcepts)
    newCompleted.add(currentIndex)

    if (currentIndex < concepts.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCompletedConcepts(newCompleted)
      saveProgress(newCompleted, newIndex, false)
    } else {
      // All concepts completed - award Genie Dollars
      const earned = awardKeyConceptsDollars(examId)
      setDollarsEarned(earned)
      setCompletedConcepts(newCompleted)
      setAllConceptsCompleted(true)
      setShowMiniGame(true)
      saveProgress(newCompleted, currentIndex, true)
      if (onComplete) onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      saveProgress(completedConcepts, currentIndex - 1, allConceptsCompleted)
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setCompletedConcepts(new Set())
    setAllConceptsCompleted(false)
    setShowMiniGame(false)
    localStorage.removeItem(storageKey)
  }

  const getDifficultyColor = (difficulty: KeyConcept['difficulty']) => {
    switch (difficulty) {
      case 'foundational':
        return COLORS.semantic.success
      case 'intermediate':
        return COLORS.semantic.warning
      case 'advanced':
        return COLORS.semantic.error
      default:
        return COLORS.primary.medium
    }
  }

  const getDifficultyLabel = (difficulty: KeyConcept['difficulty']) => {
    switch (difficulty) {
      case 'foundational':
        return t('keyConcepts.difficultyFoundational')
      case 'intermediate':
        return t('keyConcepts.difficultyIntermediate')
      case 'advanced':
        return t('keyConcepts.difficultyAdvanced')
      default:
        return difficulty
    }
  }

  const progressPercentage = (completedConcepts.size / concepts.length) * 100

  if (!currentConcept) {
    return (
      <div style={{
        padding: SPACING.md,
        backgroundColor: COLORS.background.secondary,
        borderRadius: RADIUS.lg,
        border: `1px solid ${COLORS.border.light}`,
      }}>
        <p style={{ color: COLORS.primary.medium, fontSize: TYPOGRAPHY.fontSize.sm }}>
          {t('keyConcepts.noConceptsAvailable')}
        </p>
      </div>
    )
  }

  if (showMiniGame && gamification) {
    return (
      <div style={{
        padding: SPACING.lg,
        backgroundColor: COLORS.background.primary,
        borderRadius: RADIUS.lg,
        border: `2px solid ${COLORS.semantic.success}`,
        boxShadow: SHADOWS.card,
      }}>
        {/* Completion message */}
        <div style={{ marginBottom: SPACING.lg, textAlign: 'center' }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.semantic.success,
            marginBottom: SPACING.sm,
          }}>
            🎉 {gamification.completion_message}
          </h2>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
            marginBottom: dollarsEarned > 0 ? SPACING.md : 0,
          }}>
            {gamification.reward_text}
          </p>

          {/* Genie Dollars Reward */}
          {dollarsEarned > 0 && (
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: RADIUS.lg,
              padding: `${SPACING.md} ${SPACING.lg}`,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}>
              <div style={{
                fontSize: TYPOGRAPHY.fontSize['2xl'],
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: '#92400e',
                marginBottom: SPACING.xs,
              }}>
                💵 +{dollarsEarned}
              </div>
              <div style={{
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: '#92400e',
                fontWeight: TYPOGRAPHY.fontWeight.semibold,
              }}>
                Genie Dollars!
              </div>
            </div>
          )}
        </div>

        {/* Boss question */}
        <div style={{
          padding: SPACING.md,
          backgroundColor: COLORS.background.secondary,
          borderRadius: RADIUS.md,
          marginBottom: SPACING.md,
        }}>
          <h3 style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.dark,
            marginBottom: SPACING.sm,
          }}>
            🎯 {t('keyConcepts.bossChallenge')}
          </h3>

          {/* Multiple choice question */}
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.base,
            color: COLORS.primary.text,
            marginBottom: SPACING.sm,
          }}>
            {gamification.boss_question_multiple_choice.question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {gamification.boss_question_multiple_choice.options.map((option, index) => (
              <button
                key={index}
                style={{
                  padding: SPACING.md,
                  backgroundColor: COLORS.background.primary,
                  border: `1px solid ${COLORS.border.medium}`,
                  borderRadius: RADIUS.md,
                  fontSize: TYPOGRAPHY.fontSize.base,
                  color: COLORS.primary.text,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Open question */}
        <div style={{
          padding: SPACING.md,
          backgroundColor: COLORS.background.secondary,
          borderRadius: RADIUS.md,
          marginBottom: SPACING.lg,
        }}>
          <h3 style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.dark,
            marginBottom: SPACING.sm,
          }}>
            💭 {t('keyConcepts.thinkAboutIt')}
          </h3>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.base,
            color: COLORS.primary.text,
          }}>
            {gamification.boss_question_open}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: SPACING.sm }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: SPACING.md,
              backgroundColor: COLORS.background.secondary,
              border: `1px solid ${COLORS.border.medium}`,
              borderRadius: RADIUS.md,
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.text,
              cursor: 'pointer',
              fontWeight: TYPOGRAPHY.fontWeight.medium,
            }}
          >
            {t('keyConcepts.reviewConcepts')}
          </button>
          <button
            onClick={() => setShowMiniGame(false)}
            style={{
              flex: 1,
              padding: SPACING.md,
              backgroundColor: COLORS.primary.dark,
              border: 'none',
              borderRadius: RADIUS.md,
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.background.primary,
              cursor: 'pointer',
              fontWeight: TYPOGRAPHY.fontWeight.medium,
            }}
          >
            {t('keyConcepts.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: SPACING.lg,
      backgroundColor: COLORS.background.primary,
      borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border.light}`,
      boxShadow: SHADOWS.card,
    }}>
      {/* Header with progress */}
      <div style={{ marginBottom: SPACING.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.primary.dark,
            margin: 0,
          }}>
            {t('keyConcepts.title')}
          </h2>
          <span style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
          }}>
            {currentIndex + 1} / {concepts.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: COLORS.background.secondary,
          borderRadius: RADIUS.sm,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: COLORS.semantic.success,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Concept card */}
      <div style={{
        padding: SPACING.md,
        backgroundColor: COLORS.background.secondary,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
      }}>
        {/* Badge and difficulty */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm }}>
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: COLORS.background.primary,
            borderRadius: RADIUS.sm,
            fontSize: TYPOGRAPHY.fontSize.xs,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.dark,
          }}>
            🏆 {currentConcept.badge_title}
          </div>
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: getDifficultyColor(currentConcept.difficulty),
            borderRadius: RADIUS.sm,
            fontSize: TYPOGRAPHY.fontSize.xs,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.background.primary,
          }}>
            {getDifficultyLabel(currentConcept.difficulty)}
          </div>
        </div>

        {/* Concept name and category */}
        <h3 style={{
          fontSize: TYPOGRAPHY.fontSize.xl,
          fontWeight: TYPOGRAPHY.fontWeight.bold,
          color: COLORS.primary.dark,
          marginBottom: SPACING.xs,
        }}>
          {currentConcept.concept_name}
        </h3>
        <p style={{
          fontSize: TYPOGRAPHY.fontSize.sm,
          color: COLORS.primary.medium,
          marginBottom: SPACING.md,
        }}>
          📂 {currentConcept.category}
        </p>

        {/* Definition */}
        <p style={{
          fontSize: TYPOGRAPHY.fontSize.base,
          color: COLORS.primary.text,
          lineHeight: TYPOGRAPHY.lineHeight.relaxed,
          marginBottom: SPACING.md,
        }}>
          {currentConcept.definition}
        </p>

        {/* Mini game hint */}
        <div style={{
          padding: SPACING.sm,
          backgroundColor: COLORS.semantic.info + '10',
          borderLeft: `3px solid ${COLORS.semantic.info}`,
          borderRadius: RADIUS.sm,
        }}>
          <p style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.text,
            margin: 0,
          }}>
            💡 <strong>{t('keyConcepts.hint')}:</strong> {currentConcept.mini_game_hint}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: SPACING.sm }}>
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          style={{
            flex: 1,
            padding: SPACING.md,
            backgroundColor: currentIndex === 0 ? COLORS.background.disabled : COLORS.background.secondary,
            border: `1px solid ${COLORS.border.medium}`,
            borderRadius: RADIUS.md,
            fontSize: TYPOGRAPHY.fontSize.base,
            color: currentIndex === 0 ? COLORS.primary.light : COLORS.primary.text,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontWeight: TYPOGRAPHY.fontWeight.medium,
          }}
        >
          ← {t('keyConcepts.previous')}
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 2,
            padding: SPACING.md,
            backgroundColor: COLORS.primary.dark,
            border: 'none',
            borderRadius: RADIUS.md,
            fontSize: TYPOGRAPHY.fontSize.base,
            color: COLORS.background.primary,
            cursor: 'pointer',
            fontWeight: TYPOGRAPHY.fontWeight.medium,
          }}
        >
          {currentIndex < concepts.length - 1 ? `${t('keyConcepts.next')} →` : `${t('keyConcepts.complete')} 🎉`}
        </button>
      </div>
    </div>
  )
}
