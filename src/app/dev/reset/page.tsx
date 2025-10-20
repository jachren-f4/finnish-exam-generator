'use client'

import { useState, useEffect } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, BUTTONS, TOUCH_TARGETS } from '@/constants/design-tokens'

export default function DevResetPage() {
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [genieDollarsData, setGenieDollarsData] = useState<any>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    try {
      const onboarding = localStorage.getItem('examgenie_onboarding_seen')
      const genieDollars = localStorage.getItem('examgenie_dollars')

      setOnboardingData(onboarding ? JSON.parse(onboarding) : null)
      setGenieDollarsData(genieDollars ? JSON.parse(genieDollars) : null)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const clearOnboarding = () => {
    localStorage.removeItem('examgenie_onboarding_seen')
    setMessage('✅ Onboarding data cleared! Refresh any exam page to see the onboarding again.')
    loadData()
  }

  const clearGenieDollars = () => {
    localStorage.removeItem('examgenie_dollars')
    setMessage('✅ Genie Dollars data cleared!')
    loadData()
  }

  const clearAll = () => {
    localStorage.clear()
    setMessage('✅ All localStorage cleared!')
    loadData()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.background.primary,
      padding: SPACING.xl,
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: TYPOGRAPHY.fontSize['3xl'],
          fontWeight: TYPOGRAPHY.fontWeight.bold,
          color: COLORS.primary.text,
          marginBottom: SPACING.sm,
        }}>
          🛠️ Dev Tools - localStorage Manager
        </h1>
        <p style={{
          fontSize: TYPOGRAPHY.fontSize.sm,
          color: COLORS.primary.medium,
          marginBottom: SPACING.xl,
        }}>
          Development helper page to manage localStorage data for testing
        </p>

        {/* Message */}
        {message && (
          <div style={{
            background: COLORS.semantic.success + '20',
            border: `2px solid ${COLORS.semantic.success}`,
            borderRadius: RADIUS.md,
            padding: SPACING.md,
            marginBottom: SPACING.lg,
            color: COLORS.primary.text,
          }}>
            {message}
          </div>
        )}

        {/* Onboarding Section */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border.light}`,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
        }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            marginBottom: SPACING.md,
          }}>
            Onboarding Data
          </h2>

          {onboardingData ? (
            <pre style={{
              background: COLORS.background.secondary,
              padding: SPACING.md,
              borderRadius: RADIUS.sm,
              fontSize: TYPOGRAPHY.fontSize.sm,
              overflow: 'auto',
              marginBottom: SPACING.md,
            }}>
              {JSON.stringify(onboardingData, null, 2)}
            </pre>
          ) : (
            <p style={{
              color: COLORS.primary.medium,
              marginBottom: SPACING.md,
            }}>
              No onboarding data found
            </p>
          )}

          <button
            onClick={clearOnboarding}
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
            }}
          >
            Clear Onboarding Data
          </button>
        </div>

        {/* Genie Dollars Section */}
        <div style={{
          background: COLORS.background.primary,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border.light}`,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
        }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            marginBottom: SPACING.md,
          }}>
            Genie Dollars Data
          </h2>

          {genieDollarsData ? (
            <pre style={{
              background: COLORS.background.secondary,
              padding: SPACING.md,
              borderRadius: RADIUS.sm,
              fontSize: TYPOGRAPHY.fontSize.sm,
              overflow: 'auto',
              marginBottom: SPACING.md,
            }}>
              {JSON.stringify(genieDollarsData, null, 2)}
            </pre>
          ) : (
            <p style={{
              color: COLORS.primary.medium,
              marginBottom: SPACING.md,
            }}>
              No Genie Dollars data found
            </p>
          )}

          <button
            onClick={clearGenieDollars}
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
            }}
          >
            Clear Genie Dollars Data
          </button>
        </div>

        {/* Danger Zone */}
        <div style={{
          background: COLORS.semantic.error + '10',
          borderRadius: RADIUS.lg,
          border: `2px solid ${COLORS.semantic.error}`,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
        }}>
          <h2 style={{
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.semantic.error,
            marginBottom: SPACING.md,
          }}>
            ⚠️ Danger Zone
          </h2>

          <p style={{
            color: COLORS.primary.text,
            marginBottom: SPACING.md,
          }}>
            This will clear ALL localStorage data (onboarding, Genie Dollars, etc.)
          </p>

          <button
            onClick={clearAll}
            style={{
              background: COLORS.semantic.error,
              color: '#FFFFFF',
              padding: BUTTONS.primary.padding,
              borderRadius: BUTTONS.primary.radius,
              border: 'none',
              fontSize: TYPOGRAPHY.fontSize.base,
              fontWeight: TYPOGRAPHY.fontWeight.medium,
              minHeight: TOUCH_TARGETS.comfortable,
              cursor: 'pointer',
            }}
          >
            Clear All localStorage
          </button>
        </div>

        {/* Quick Links */}
        <div style={{
          background: COLORS.background.secondary,
          borderRadius: RADIUS.lg,
          padding: SPACING.lg,
        }}>
          <h3 style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            marginBottom: SPACING.md,
          }}>
            Quick Links
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}>
            <li style={{ marginBottom: SPACING.sm }}>
              <a href="/" style={{ color: COLORS.primary.dark }}>← Back to Home</a>
            </li>
            <li style={{ marginBottom: SPACING.sm }}>
              <a href="/exam/55220c3a-da62-44b1-840e-3a2bc38cc14d/take" style={{ color: COLORS.primary.dark }}>
                Test Exam Page (with onboarding)
              </a>
            </li>
          </ul>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: SPACING.xl,
          padding: SPACING.lg,
          background: COLORS.background.secondary,
          borderRadius: RADIUS.md,
        }}>
          <h3 style={{
            fontSize: TYPOGRAPHY.fontSize.base,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.primary.text,
            marginBottom: SPACING.sm,
          }}>
            How to Test Onboarding:
          </h3>
          <ol style={{
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.primary.medium,
            paddingLeft: SPACING.lg,
          }}>
            <li>Click "Clear Onboarding Data"</li>
            <li>Visit any exam page (e.g., /exam/[id]/take)</li>
            <li>Onboarding will appear automatically</li>
            <li>After dismissing, it won't show again for that exam</li>
            <li>Return here and clear again to test multiple times</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
