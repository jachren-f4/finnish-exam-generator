'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'

interface OnboardingOverlayProps {
  onDismiss: () => void
  detectedLanguage?: string | null
}

export function OnboardingOverlay({ onDismiss, detectedLanguage }: OnboardingOverlayProps) {
  const { t } = useTranslation(detectedLanguage)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchEndY, setTouchEndY] = useState(0)

  const totalSlides = 4

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.changedTouches[0].screenX)
    setTouchStartY(e.changedTouches[0].screenY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].screenX)
    setTouchEndY(e.changedTouches[0].screenY)
    handleSwipe()
  }

  const handleSwipe = () => {
    const swipeThreshold = 50
    const horizontalSwipe = Math.abs(touchStartX - touchEndX)
    const verticalSwipe = Math.abs(touchStartY - touchEndY)

    // Only handle horizontal swipes (not vertical)
    if (horizontalSwipe > verticalSwipe) {
      if (touchStartX - touchEndX > swipeThreshold) {
        // Swiped left - next slide
        nextSlide()
      }
      if (touchEndX - touchStartX > swipeThreshold) {
        // Swiped right - previous slide
        previousSlide()
      }
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (currentSlide < totalSlides - 1) {
          nextSlide()
        } else {
          onDismiss()
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        previousSlide()
      }
      if (e.key === 'Escape') {
        onDismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, onDismiss])

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onDismiss()
    }
  }

  const previousSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slides = [
    {
      icon: '👋',
      title: t('onboarding.slide1Title'),
      description: t('onboarding.slide1Description'),
    },
    {
      icon: '⬅️ ➡️',
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Description'),
    },
    {
      icon: '💵',
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Description'),
    },
    {
      icon: '🎉',
      title: t('onboarding.slide4Title'),
      description: t('onboarding.slide4Description'),
    },
  ]

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.3s',
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: COLORS.background.primary,
          borderRadius: `${RADIUS.lg} ${RADIUS.lg} 0 0`,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
          zIndex: 9999,
          maxWidth: '640px',
          margin: '0 auto',
          animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sheet handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: COLORS.border.medium,
            borderRadius: RADIUS.full,
            margin: `12px auto 8px`,
            cursor: 'grab',
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: `${SPACING.xs} ${SPACING.lg} ${SPACING.md}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: SPACING.xs }}>
            {[...Array(totalSlides)].map((_, index) => (
              <div
                key={index}
                style={{
                  width: index === currentSlide ? '20px' : '8px',
                  height: '8px',
                  borderRadius: RADIUS.sm,
                  background: index === currentSlide ? COLORS.primary.dark : COLORS.border.light,
                  transition: TRANSITIONS.normal,
                }}
              />
            ))}
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.primary.medium,
              fontSize: TYPOGRAPHY.fontSize.xl,
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: RADIUS.full,
              transition: TRANSITIONS.normal,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              display: 'flex',
              transition: TRANSITIONS.normal,
              transform: `translateX(-${currentSlide * 100}%)`,
              height: '100%',
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                style={{
                  flex: '0 0 100%',
                  minWidth: 0,
                  padding: SPACING.lg,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: '56px',
                    textAlign: 'center',
                    marginBottom: SPACING.md,
                  }}
                >
                  {slide.icon}
                </div>
                <h2
                  style={{
                    fontSize: TYPOGRAPHY.fontSize['2xl'],
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: COLORS.primary.text,
                    marginBottom: SPACING.sm,
                    textAlign: 'center',
                  }}
                >
                  {slide.title}
                </h2>
                <p
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.base,
                    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
                    color: COLORS.primary.medium,
                    textAlign: 'center',
                  }}
                >
                  {slide.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Swipe hint */}
        <div
          style={{
            textAlign: 'center',
            fontSize: TYPOGRAPHY.fontSize.xs,
            color: COLORS.primary.medium,
            paddingBottom: SPACING.xs,
          }}
        >
          {t('onboarding.swipeHint')}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: `${SPACING.md} ${SPACING.lg} ${SPACING.lg}`,
            borderTop: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            gap: SPACING.sm,
          }}
        >
          <button
            onClick={previousSlide}
            disabled={currentSlide === 0}
            style={{
              flex: 1,
              padding: BUTTONS.secondary.padding,
              borderRadius: BUTTONS.secondary.radius,
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              border: `2px solid ${COLORS.border.medium}`,
              background: BUTTONS.secondary.background,
              color: BUTTONS.secondary.text,
              minHeight: TOUCH_TARGETS.comfortable,
              opacity: currentSlide === 0 ? 0.4 : 1,
              transition: TRANSITIONS.normal,
            }}
          >
            ← {t('common.prev')}
          </button>
          <button
            onClick={nextSlide}
            style={{
              flex: 1,
              padding: BUTTONS.primary.padding,
              borderRadius: BUTTONS.primary.radius,
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              cursor: 'pointer',
              border: 'none',
              background: COLORS.primary.dark,
              color: '#FFFFFF',
              minHeight: TOUCH_TARGETS.comfortable,
              transition: TRANSITIONS.normal,
            }}
          >
            {currentSlide === totalSlides - 1 ? t('onboarding.gotIt') : `${t('common.next')} →`}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
