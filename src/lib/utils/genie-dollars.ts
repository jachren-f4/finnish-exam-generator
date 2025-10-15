/**
 * Genie Dollars - Gamification system for ExamGenie
 *
 * Awards:
 * - 5 Genie Dollars for completing audio summary
 * - 10 Genie Dollars for completing exam
 *
 * Storage: Browser localStorage (per-device)
 * Earning: Once per exam per activity
 */

const STORAGE_KEY = 'examgenie_dollars'

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
 * Award Genie Dollars for completing audio summary
 * Returns the amount awarded (0 if already earned)
 */
export function awardAudioDollars(examId: string): number {
  if (hasEarnedAudioReward(examId)) {
    return 0
  }

  const data = getGenieDollarsData()

  if (!data.completions[examId]) {
    data.completions[examId] = { audioEarned: false, examEarned: false }
  }

  data.completions[examId].audioEarned = true
  data.totalDollars += GENIE_DOLLAR_REWARDS.AUDIO

  saveGenieDollarsData(data)
  return GENIE_DOLLAR_REWARDS.AUDIO
}

/**
 * Award Genie Dollars for completing exam
 * Returns the amount awarded (0 if already earned)
 */
export function awardExamDollars(examId: string): number {
  if (hasEarnedExamReward(examId)) {
    return 0
  }

  const data = getGenieDollarsData()

  if (!data.completions[examId]) {
    data.completions[examId] = { audioEarned: false, examEarned: false }
  }

  data.completions[examId].examEarned = true
  data.totalDollars += GENIE_DOLLAR_REWARDS.EXAM

  saveGenieDollarsData(data)
  return GENIE_DOLLAR_REWARDS.EXAM
}

/**
 * Get completion status for a specific exam
 */
export function getExamCompletionStatus(examId: string) {
  const data = getGenieDollarsData()
  return {
    audioEarned: data.completions[examId]?.audioEarned ?? false,
    examEarned: data.completions[examId]?.examEarned ?? false,
  }
}
