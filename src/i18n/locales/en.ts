/**
 * English (EN) Translations
 * All user-facing text in English
 */

export const en = {
  common: {
    // Loading & Errors
    loading: 'Loading...',
    error: 'Error',
    notFound: 'Not found',
    retry: 'Retry',
    loadFailed: 'Load failed',

    // Navigation
    prev: 'PREV',
    next: 'NEXT',
    submit: 'SUBMIT',
    cancel: 'CANCEL',

    // Actions
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',

    // Status
    success: 'Success',
    pending: 'Pending',
    completed: 'Completed',

    // Progress
    questionOf: '/',
    progress: 'Progress',
    done: 'Done',
    left: 'Left',

    // Question Types
    questionTypeMC: 'MC',
    questionTypeTF: 'T/F',
    questionTypeText: 'Text',
    questionTypeFill: 'Fill',

    // Answers
    true: 'True',
    false: 'False',
    yourAnswer: 'Your answer...',

    // Results
    correct: 'Correct',
    partial: 'Partial',
    incorrect: 'Incorrect',
    total: 'Total',
    points: 'pts',
    noResults: 'No results',
    notGraded: 'Not graded yet',
    notGradedDesc: 'This exam has not been graded yet.',

    // Submission
    confirmSubmit: 'Confirm submit?',
    submitWarning: 'Submit answers? Cannot undo.',
    sending: 'Sending...',

    // Modes
    retake: 'Retake',
    review: 'Review',
    start: 'Start',
    mode: 'Mode:',

    // General
    question: 'Question',

    // Grading Results Page
    resultsTitle: 'Results',
    gradeScale: 'Grade scale:',
    answersByQuestion: 'Answers',
    options: 'Options:',
    yourAnswerLabel: 'Your answer:',
    correctAnswerLabel: 'Correct:',
    examInfo: 'Exam info',
    gradingInfo: 'Grading info',
    printResults: 'Print',
    newExam: 'New exam',
    created: 'Created:',
    submitted: 'Submitted:',
    graded: 'Graded:',
    examId: 'Exam ID:',
    notAvailable: 'N/A',
    gradingMethod: 'Method:',
    aiGrading: 'AI',
    ruleBased: 'Rules',
    aiGraded: 'AI graded:',
    ruleBasedGraded: 'Rule graded:',
    aiAvailable: 'AI available:',
    yes: 'Yes',
    no: 'No',
    aiUsage: 'AI usage:',
    tokens: 'tokens',
    estimatedCost: 'Est. cost:',
    questionsCount: 'questions',

    // Time
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',

    // Accessibility (ARIA labels)
    aria: {
      questionNavigation: 'Question navigation',
      progressBar: 'Exam progress',
      submitDialog: 'Submission confirmation dialog',
      previousQuestion: 'Go to previous question',
      nextQuestion: 'Go to next question',
      submitAnswers: 'Submit all answers',
      cancelSubmission: 'Cancel submission',
      questionType: 'Question type',
      pointsValue: 'Points value',
      answerOption: 'Answer option',
    },
  },

  // Placeholder namespaces - will be filled in Phase 1-3
  api: {
    errors: {
      // Will be filled in Phase 1
    }
  },

  examMenu: {
    // Will be filled in Phase 3
  },

  examTaking: {
    // Will be filled in Phase 3
  },

  examAudio: {
    // Will be filled in Phase 3
  },

  examGrading: {
    // Will be filled in Phase 3
  },

  sharedExam: {
    // Will be filled in Phase 2
  },
} as const // 'as const' for type-safe keys
