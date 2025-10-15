'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamData } from '@/lib/supabase'
import { EXAM_UI } from '@/constants/exam-ui'
import { ICONS } from '@/constants/exam-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTONS, TOUCH_TARGETS, TRANSITIONS } from '@/constants/design-tokens'
import { awardAudioDollars } from '@/lib/utils/genie-dollars'

interface AudioExamState extends ExamData {
  audio_url?: string | null
  summary_text?: string | null
  audio_metadata?: {
    duration_seconds?: number
    word_count?: number
    language?: string
  } | null
}

export default function AudioSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<AudioExamState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [celebrationMessage, setCelebrationMessage] = useState('')

  useEffect(() => {
    if (examId) {
      fetchExam()
    }
  }, [examId])

  // Auto-play when audio is loaded
  useEffect(() => {
    if (exam?.audio_url && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Auto-play prevented by browser:', err)
      })
    }
  }, [exam?.audio_url])

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

      // Check if audio is available
      if (!examData.audio_url || examData.audio_url.trim() === '') {
        throw new Error('Audio summary not available for this exam')
      }
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err instanceof Error ? err.message : EXAM_UI.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)

    // Award Genie Dollars
    const awarded = awardAudioDollars(examId)
    if (awarded > 0) {
      setCelebrationMessage(`🎉 You earned ${awarded} Genie Dollars! 💵`)
      // Clear message after 3 seconds
      setTimeout(() => setCelebrationMessage(''), 3000)
    }
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
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${COLORS.primary.dark};
          cursor: pointer;
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${COLORS.primary.dark};
          cursor: pointer;
          border: none;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
            Audio Summary
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
        {/* Info Card */}
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
            Grade {exam.grade} • Audio overview
          </p>
        </div>

        {/* Audio Player Card */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          padding: SPACING.lg,
          marginBottom: SPACING.md,
          position: 'relative',
        }}>
          {/* Celebration Message */}
          {celebrationMessage && (
            <div style={{
              position: 'absolute',
              top: SPACING.md,
              left: SPACING.md,
              right: SPACING.md,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#FFFFFF',
              padding: SPACING.md,
              borderRadius: RADIUS.md,
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              textAlign: 'center',
              boxShadow: SHADOWS.card,
              animation: 'slideDown 0.3s ease-out',
              zIndex: 10,
            }}>
              {celebrationMessage}
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SPACING.md,
          }}>
            <div style={{
              fontSize: '48px',
              lineHeight: 1,
            }}>
              🎧
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            src={exam.audio_url || ''}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="auto"
            style={{ display: 'none' }}
          />

          {/* Custom Audio Controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md,
            marginBottom: SPACING.md,
          }}>
            {/* Play/Pause Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
            }}>
              <button
                onClick={togglePlayPause}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: RADIUS.full,
                  background: COLORS.primary.dark,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: TRANSITIONS.normal,
                  boxShadow: SHADOWS.card,
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <span style={{
                  fontSize: '48px',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isPlaying ? '⏸' : '▶'}
                </span>
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.xs,
            }}>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: RADIUS.sm,
                  appearance: 'none',
                  background: `linear-gradient(to right, ${COLORS.primary.dark} 0%, ${COLORS.primary.dark} ${(currentTime / duration) * 100}%, ${COLORS.border.light} ${(currentTime / duration) * 100}%, ${COLORS.border.light} 100%)`,
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: COLORS.primary.medium,
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {exam.audio_metadata && (
            <div style={{
              display: 'flex',
              gap: SPACING.md,
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.primary.medium,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {exam.audio_metadata.duration_seconds && (
                <span>Duration: {formatDuration(exam.audio_metadata.duration_seconds)}</span>
              )}
              {exam.audio_metadata.word_count && (
                <span>• {exam.audio_metadata.word_count} words</span>
              )}
              {exam.audio_metadata.language && (
                <span>• {exam.audio_metadata.language.toUpperCase()}</span>
              )}
            </div>
          )}
        </div>

        {/* Summary Text Card */}
        {exam.summary_text && (
          <div style={{
            background: COLORS.background.primary,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOWS.card,
            padding: SPACING.md,
            marginBottom: SPACING.md,
          }}>
            <h3 style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              color: COLORS.primary.text,
              marginBottom: SPACING.md,
              lineHeight: TYPOGRAPHY.lineHeight.normal,
            }}>
              Summary Text
            </h3>
            <div style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              color: COLORS.primary.text,
              lineHeight: TYPOGRAPHY.lineHeight.relaxed,
              whiteSpace: 'pre-wrap',
            }}>
              {exam.summary_text}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
