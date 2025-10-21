/**
 * Onboarding localStorage Utilities
 *
 * Tracks whether users have seen the onboarding flow for each exam.
 * Uses localStorage for per-device, per-exam persistence.
 */

const STORAGE_KEY = 'examgenie_onboarding_seen'

interface OnboardingData {
  [examId: string]: boolean
}

/**
 * Check if user has seen onboarding for a specific exam
 */
export function hasSeenOnboarding(examId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false

    const data: OnboardingData = JSON.parse(stored)
    return data[examId] === true
  } catch (error) {
    console.error('Failed to check onboarding status:', error)
    return false
  }
}

/**
 * Mark onboarding as seen for a specific exam
 */
export function markOnboardingSeen(examId: string): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY) || '{}'
    const data: OnboardingData = JSON.parse(stored)

    data[examId] = true

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save onboarding status:', error)
  }
}

/**
 * Clear onboarding status for a specific exam (useful for testing)
 */
export function clearOnboarding(examId: string): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    const data: OnboardingData = JSON.parse(stored)
    delete data[examId]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to clear onboarding status:', error)
  }
}

/**
 * Clear all onboarding status (useful for testing)
 */
export function clearAllOnboarding(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear all onboarding status:', error)
  }
}

/**
 * Get all exams that have seen onboarding
 */
export function getOnboardingHistory(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const data: OnboardingData = JSON.parse(stored)
    return Object.keys(data).filter(examId => data[examId] === true)
  } catch (error) {
    console.error('Failed to get onboarding history:', error)
    return []
  }
}
