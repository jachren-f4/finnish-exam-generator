// UI Text Constants for Language-Agnostic Exam Interface
// All text in minimal English with icon support

export const EXAM_UI = {
  // Loading & Errors
  LOADING: "Loading...",
  ERROR: "Error",
  NOT_FOUND: "Not found",
  RETRY: "Retry",
  LOAD_FAILED: "Load failed",

  // Navigation
  PREV: "PREV",
  NEXT: "NEXT",
  SUBMIT: "SUBMIT",
  CANCEL: "CANCEL",

  // Progress
  QUESTION_OF: "/", // Shows as "3/10"
  PROGRESS: "Progress",
  DONE: "Done",
  LEFT: "Left",

  // Question Types (abbreviations)
  MC: "MC",           // Multiple Choice
  TF: "T/F",          // True/False
  TEXT: "Text",       // Short Answer
  FILL: "Fill",       // Fill in the blank
  POINTS: "pts",

  // Answers
  TRUE: "True",
  FALSE: "False",
  YOUR_ANSWER: "Your answer...",

  // Submission
  CONFIRM_SUBMIT: "Confirm submit?",
  SUBMIT_WARNING: "Submit answers? Cannot undo.",
  SENDING: "Sending...",

  // Results
  CORRECT: "Correct",
  PARTIAL: "Partial",
  INCORRECT: "Incorrect",
  TOTAL: "Total",
  NO_RESULTS: "No results",
  NOT_GRADED: "Not graded yet",
  NOT_GRADED_DESC: "This exam has not been graded yet.",

  // Modes
  RETAKE: "Retake",
  REVIEW: "Review",
  START: "Start",
  MODE: "Mode:",

  // Question
  QUESTION: "Question",

  // Grading Results Page
  RESULTS_TITLE: "Results",
  GRADE_SCALE: "Grade scale:",
  ANSWERS_BY_QUESTION: "Answers",
  OPTIONS: "Options:",
  YOUR_ANSWER_LABEL: "Your answer:",
  CORRECT_ANSWER_LABEL: "Correct:",
  EXAM_INFO: "Exam info",
  GRADING_INFO: "Grading info",
  PRINT_RESULTS: "Print",
  NEW_EXAM: "New exam",
  CREATED: "Created:",
  SUBMITTED: "Submitted:",
  GRADED: "Graded:",
  EXAM_ID: "Exam ID:",
  NOT_AVAILABLE: "N/A",
  GRADING_METHOD: "Method:",
  AI_GRADING: "AI",
  RULE_BASED: "Rules",
  AI_GRADED: "AI graded:",
  RULE_BASED_GRADED: "Rule graded:",
  AI_AVAILABLE: "AI available:",
  YES: "Yes",
  NO: "No",
  AI_USAGE: "AI usage:",
  TOKENS: "tokens",
  ESTIMATED_COST: "Est. cost:",
  QUESTIONS_COUNT: "questions",

  // Accessibility (ARIA labels - can be more descriptive)
  ARIA: {
    QUESTION_NAVIGATION: "Question navigation",
    PROGRESS_BAR: "Exam progress",
    SUBMIT_DIALOG: "Submission confirmation dialog",
    PREVIOUS_QUESTION: "Go to previous question",
    NEXT_QUESTION: "Go to next question",
    SUBMIT_ANSWERS: "Submit all answers",
    CANCEL_SUBMISSION: "Cancel submission",
    QUESTION_TYPE: "Question type",
    POINTS_VALUE: "Points value",
    ANSWER_OPTION: "Answer option",
  }
} as const

export type ExamUIKeys = keyof typeof EXAM_UI
