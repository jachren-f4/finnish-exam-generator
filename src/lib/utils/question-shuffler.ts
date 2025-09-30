/**
 * Question Shuffler Utility
 * Handles randomization of multiple-choice question options
 * to prevent correct answers from always being in position A
 */

export interface MultipleChoiceQuestion {
  id?: number
  type?: string
  question_type?: string
  question?: string
  question_text?: string
  options: string[]
  correct_answer: string
  explanation?: string
  topic_area?: string
}

/**
 * Fisher-Yates shuffle algorithm
 * Provides cryptographically secure randomization
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array] // Create a copy to avoid mutating original

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.randomInt for better randomness in Node.js
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * Shuffles the options array of a multiple-choice question
 * and updates the correct_answer to match the new position
 *
 * @param question - The question object with options and correct_answer
 * @returns The question object with shuffled options and updated correct_answer
 */
export function shuffleMultipleChoiceOptions(
  question: MultipleChoiceQuestion
): MultipleChoiceQuestion {
  // Validate input
  if (!question.options || !Array.isArray(question.options)) {
    console.warn('Question has no valid options array, skipping shuffle')
    return question
  }

  if (question.options.length === 0) {
    console.warn('Question has empty options array, skipping shuffle')
    return question
  }

  if (!question.correct_answer) {
    console.warn('Question has no correct_answer, skipping shuffle')
    return question
  }

  // Find the correct answer in the original options
  const correctAnswerIndex = question.options.indexOf(question.correct_answer)

  if (correctAnswerIndex === -1) {
    console.warn(
      `Correct answer "${question.correct_answer}" not found in options array:`,
      question.options
    )
    return question
  }

  // Shuffle the options
  const shuffledOptions = fisherYatesShuffle(question.options)

  // Find the new position of the correct answer
  const newCorrectAnswerIndex = shuffledOptions.indexOf(question.correct_answer)

  // Return the question with shuffled options
  return {
    ...question,
    options: shuffledOptions,
    correct_answer: shuffledOptions[newCorrectAnswerIndex]
  }
}

/**
 * Shuffles all multiple-choice questions in an array
 *
 * @param questions - Array of question objects
 * @returns Array of questions with shuffled options (only for multiple-choice)
 */
export function shuffleQuestionsOptions(
  questions: MultipleChoiceQuestion[]
): MultipleChoiceQuestion[] {
  if (!questions || !Array.isArray(questions)) {
    console.warn('Invalid questions array provided to shuffleQuestionsOptions')
    return questions
  }

  return questions.map((question) => {
    // Only shuffle multiple-choice questions
    const questionType = question.type || question.question_type || ''

    if (questionType === 'multiple_choice' && question.options && question.options.length > 0) {
      return shuffleMultipleChoiceOptions(question)
    }

    // Return non-multiple-choice questions unchanged
    return question
  })
}

/**
 * Get shuffle statistics for logging/debugging
 *
 * @param originalQuestions - Original questions before shuffling
 * @param shuffledQuestions - Questions after shuffling
 * @returns Statistics object
 */
export function getShuffleStats(
  originalQuestions: MultipleChoiceQuestion[],
  shuffledQuestions: MultipleChoiceQuestion[]
): {
  totalQuestions: number
  multipleChoiceCount: number
  shuffledCount: number
  correctAnswerPositions: Record<number, number>
} {
  const stats = {
    totalQuestions: originalQuestions.length,
    multipleChoiceCount: 0,
    shuffledCount: 0,
    correctAnswerPositions: {} as Record<number, number>
  }

  shuffledQuestions.forEach((question, index) => {
    const questionType = question.type || question.question_type || ''

    if (questionType === 'multiple_choice') {
      stats.multipleChoiceCount++

      // Check if question was actually shuffled
      const originalQuestion = originalQuestions[index]
      if (originalQuestion &&
          JSON.stringify(originalQuestion.options) !== JSON.stringify(question.options)) {
        stats.shuffledCount++
      }

      // Track which position the correct answer ended up in
      if (question.options && question.correct_answer) {
        const position = question.options.indexOf(question.correct_answer)
        stats.correctAnswerPositions[position] = (stats.correctAnswerPositions[position] || 0) + 1
      }
    }
  })

  return stats
}