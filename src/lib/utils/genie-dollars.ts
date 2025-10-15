/**
 * Genie Dollars - Gamification system for ExamGenie
 *
 * Awards:
 * - 5 Genie Dollars for completing audio summary
 * - 10 Genie Dollars for completing exam
 *
 * Storage: Browser localStorage (per-device)
 * Earning: Once per exam per activity, repeatable every 12 hours
 */

const STORAGE_KEY = 'examgenie_dollars'
const HOURS_BETWEEN_REWARDS = 12

export const GENIE_DOLLAR_REWARDS = {
  AUDIO: 5,
  EXAM: 10,
} as const

interface GenieDollarsData {
  totalDollars: number
  completions: {
    [examId: string]: {
      audioEarned: boolean
      examEarned: boolean
      audioLastEarnedAt?: number // timestamp in ms
      examLastEarnedAt?: number // timestamp in ms
    }
  }
}

/**
 * Get Genie Dollars data from localStorage
 */
export function getGenieDollarsData(): GenieDollarsData {
  if (typeof window === 'undefined') {
    return { totalDollars: 0, completions: {} }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { totalDollars: 0, completions: {} }
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to parse Genie Dollars data:', error)
    return { totalDollars: 0, completions: {} }
  }
}

/**
 * Save Genie Dollars data to localStorage
 */
function saveGenieDollarsData(data: GenieDollarsData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save Genie Dollars data:', error)
  }
}

/**
 * Get total Genie Dollars earned
 */
export function getTotalGenieDollars(): number {
  return getGenieDollarsData().totalDollars
}

/**
 * Check if audio reward has been earned for an exam
 */
export function hasEarnedAudioReward(examId: string): boolean {
  const data = getGenieDollarsData()
  return data.completions[examId]?.audioEarned ?? false
}

/**
 * Check if exam reward has been earned for an exam
 */
export function hasEarnedExamReward(examId: string): boolean {
  const data = getGenieDollarsData()
  return data.completions[examId]?.examEarned ?? false
}

/**
 * Check if audio reward is currently eligible (never earned or 12 hours passed)
 */
export function isAudioRewardEligible(examId: string): boolean {
  const data = getGenieDollarsData()
  const completion = data.completions[examId]

  if (!completion || !completion.audioLastEarnedAt) {
    return true // Never earned, eligible
  }

  const now = Date.now()
  const hoursSinceLastEarned = (now - completion.audioLastEarnedAt) / (1000 * 60 * 60)
  return hoursSinceLastEarned >= HOURS_BETWEEN_REWARDS
}

/**
 * Check if exam reward is currently eligible (never earned or 12 hours passed)
 */
export function isExamRewardEligible(examId: string): boolean {
  const data = getGenieDollarsData()
  const completion = data.completions[examId]

  if (!completion || !completion.examLastEarnedAt) {
    return true // Never earned, eligible
  }

  const now = Date.now()
  const hoursSinceLastEarned = (now - completion.examLastEarnedAt) / (1000 * 60 * 60)
  return hoursSinceLastEarned >= HOURS_BETWEEN_REWARDS
}

/**
 * Get hours remaining until audio reward is eligible again
 * Returns 0 if eligible now
 */
export function getAudioRewardHoursRemaining(examId: string): number {
  const data = getGenieDollarsData()
  const completion = data.completions[examId]

  if (!completion || !completion.audioLastEarnedAt) {
    return 0 // Eligible now
  }

  const now = Date.now()
  const hoursSinceLastEarned = (now - completion.audioLastEarnedAt) / (1000 * 60 * 60)
  const remaining = HOURS_BETWEEN_REWARDS - hoursSinceLastEarned

  return remaining > 0 ? remaining : 0
}

/**
 * Get hours remaining until exam reward is eligible again
 * Returns 0 if eligible now
 */
export function getExamRewardHoursRemaining(examId: string): number {
  const data = getGenieDollarsData()
  const completion = data.completions[examId]

  if (!completion || !completion.examLastEarnedAt) {
    return 0 // Eligible now
  }

  const now = Date.now()
  const hoursSinceLastEarned = (now - completion.examLastEarnedAt) / (1000 * 60 * 60)
  const remaining = HOURS_BETWEEN_REWARDS - hoursSinceLastEarned

  return remaining > 0 ? remaining : 0
}

/**
 * Award Genie Dollars for completing audio summary
 * Returns the amount awarded (0 if not eligible)
 */
export function awardAudioDollars(examId: string): number {
  if (!isAudioRewardEligible(examId)) {
    return 0
  }

  const data = getGenieDollarsData()
  const now = Date.now()

  if (!data.completions[examId]) {
    data.completions[examId] = { audioEarned: false, examEarned: false }
  }

  data.completions[examId].audioEarned = true
  data.completions[examId].audioLastEarnedAt = now
  data.totalDollars += GENIE_DOLLAR_REWARDS.AUDIO

  saveGenieDollarsData(data)
  return GENIE_DOLLAR_REWARDS.AUDIO
}

/**
 * Award Genie Dollars for completing exam
 * Returns the amount awarded (0 if not eligible)
 */
export function awardExamDollars(examId: string): number {
  if (!isExamRewardEligible(examId)) {
    return 0
  }

  const data = getGenieDollarsData()
  const now = Date.now()

  if (!data.completions[examId]) {
    data.completions[examId] = { audioEarned: false, examEarned: false }
  }

  data.completions[examId].examEarned = true
  data.completions[examId].examLastEarnedAt = now
  data.totalDollars += GENIE_DOLLAR_REWARDS.EXAM

  saveGenieDollarsData(data)
  return GENIE_DOLLAR_REWARDS.EXAM
}

/**
 * Format hours remaining as human-readable string
 */
export function formatHoursRemaining(hours: number): string {
  if (hours <= 0) return ''

  if (hours >= 1) {
    return `${Math.ceil(hours)}h`
  } else {
    const minutes = Math.ceil(hours * 60)
    return `${minutes}m`
  }
}

/**
 * Get completion status for a specific exam
 */
export function getExamCompletionStatus(examId: string) {
  const data = getGenieDollarsData()
  return {
    audioEarned: data.completions[examId]?.audioEarned ?? false,
    examEarned: data.completions[examId]?.examEarned ?? false,
    audioEligible: isAudioRewardEligible(examId),
    examEligible: isExamRewardEligible(examId),
    audioHoursRemaining: getAudioRewardHoursRemaining(examId),
    examHoursRemaining: getExamRewardHoursRemaining(examId),
  }
}
