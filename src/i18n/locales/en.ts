/**
 * English (en) Translations
 *
 * Contains all English text for the ExamGenie application.
 * Extracted from:
 * - /src/constants/exam-ui.ts
 * - /src/constants/help-content.ts
 * - Hardcoded strings across the application
 */

import type { Translations } from '../types'

export const en: Translations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    notFound: 'Not found',
    retry: 'Retry',
    loadFailed: 'Load failed',
    prev: 'Previous',
    next: 'Next',
    submit: 'Submit',
    cancel: 'Cancel',
    done: 'Done',
    backToMenu: 'Back to Menu',
  },

  examMenu: {
    title: 'ExamGenie',
    genieDollars: 'Genie Dollars',
    audio: 'Audio',
    exam: 'Exam',
    results: 'Results',
    retake: 'Retake',
    mistakes: 'Mistakes',
    ranking: 'Ranking',
    help: 'Help',
    na: 'N/A',
    pending: 'Pending',
    view: 'View',
    perfect: 'Perfect!',
    soon: 'Soon',
    learn: 'Learn',
    gradeInfo: 'Grade {grade} • {count} questions',
    questionsCount: '{count} questions',
    rewardAmount: '+{amount}',
    audioDescription: 'Listen to an overview of the material before taking the exam',
    startExam: 'Start Exam',
    resultsDescription: 'View your exam results and feedback',
    resultsLocked: 'Complete the exam to see results',
    viewResults: 'View Results',
    retakeFullExam: 'Retake Full Exam',
    retakeDescription: 'Practice again with all questions',
    retakeLocked: 'Complete the exam first to unlock retakes',
    startRetake: 'Start Retake',
    practiceMistakes: 'Practice Mistakes',
    reviewWrongQuestions: 'Review {count} question{s} you got wrong',
    perfectScore: 'Perfect score! No mistakes to practice',
    mistakesLocked: 'Complete the exam to see your mistakes',
    practiceNow: 'Practice Now',
    rankingComingSoon: 'Coming soon - compete with other students',
    helpFaq: 'Help & FAQ',
    helpDescription: 'Learn about ExamGenie, Genie Dollars, and get answers to common questions',
    viewHelp: 'View Help',
    listenNow: 'Listen Now',
    fullExam: 'Full Exam',
    leaderboard: 'Leaderboard',
    aboutExamGenie: 'about ExamGenie, Genie Dollars, and get answers to common questions',
  },

  examTaking: {
    title: 'Take Exam',
    gradeInfo: 'Grade {grade} • {count} questions',
    questionNumber: '{current} / {total}',
    yourAnswer: 'Your answer...',
    true: 'True',
    false: 'False',
    confirmSubmit: 'Confirm submit?',
    submitWarning: 'Submit answers? Cannot undo.',
    sending: 'Sending...',
    noResults: 'No results',
    notGraded: 'Not graded yet',
    notGradedDesc: 'This exam has not been graded yet.',
    start: 'Start',
    submissionFailed: 'Answer submission failed',
    noWrongAnswers: 'No wrong answers to practice!',
    previousAnswer: 'Previous Answer',
    tapToView: 'Tap to view',
    youAnswered: 'You answered:',
    noAnswer: 'No answer',
    close: 'Close',
    previousPoints: 'Previous: {status} {points}/{maxPoints} points • {action}',
  },

  examAudio: {
    title: 'Audio Summary',
    gradeInfo: 'Grade {grade} • Audio overview',
    backToMenu: 'Back to Menu',
    summaryText: 'Summary Text',
    play: 'Play',
    pause: 'Pause',
    duration: 'Duration:',
    words: '{count} words',
    language: '{language}',
    earnedReward: '🎉 You earned {amount} Genie Dollars! 💵',
    listenThreshold: '⏰ Listen to at least {percent}% to earn Genie Dollars',
    audioNotAvailable: 'Audio summary not available for this exam',
  },

  examGrading: {
    title: 'ExamGenie',
    backToMenu: 'Back to Menu',
    printResults: 'Print',
    newExam: 'New exam',
    correct: 'Correct',
    partial: 'Partial',
    incorrect: 'Incorrect',
    total: 'Total',
    points: '{points} pts',
    excellentWork: 'Excellent Work!',
    goodJob: 'Good Job!',
    keepPracticing: 'Keep Practicing',
    questionOf: 'Question {current} of {total}',
    yourAnswer: 'Your Answer',
    correctAnswer: 'Correct Answer',
    resultsReviewed: 'Results Reviewed!',
    reviewedAll: "You've reviewed all {count} questions",
    attemptNumber: 'Attempt #{number}',
    improvement: 'Improvement!',
    keepTrying: 'Keep Practicing',
    sameScore: 'Same Score',
    gradeDiff: 'Grade: {diff}',
    pointsDiff: 'Points: {diff}',
    wrong: 'Wrong',
  },

  sharedExam: {
    loading: 'Loading exam...',
    notFound: 'Exam not found',
    notFoundDetails: 'Check the link or contact the person who shared this exam with you.',
    title: 'Shared Exam',
    publicView: 'Public View',
    print: 'Print',
    studentName: "Student's name:",
    created: 'Created:',
    questions: 'Questions:',
    totalPoints: 'Total points:',
    examId: 'Exam ID:',
    instructions: 'Instructions',
    instruction1: 'Read each question carefully',
    instruction2: 'Answer all questions',
    instruction3: 'For multiple choice questions, select the best answer',
    instruction4: 'Write answers clearly and legibly',
    answerPlaceholder: 'Write your answer here...',
    points: '{points} p',
    createdWith: 'Created with',
    appName: 'ExamGenie',
    application: 'application',
    printHeader: 'ExamGenie',
    printSubheader: 'Automatically generated exam',
  },

  help: {
    pageTitle: 'Help & FAQ',
    backToMenu: 'Back to Menu',
    sectionGettingStarted: 'Getting Started',
    sectionGenieDollars: 'Genie Dollars System',
    sectionFeatures: 'Features Overview',
    sectionTips: 'Tips & Shortcuts',
    sectionFaq: 'Common Questions',

    // Getting Started
    gettingStartedWhatIs: 'What is ExamGenie?',
    gettingStartedWhatIsContent:
      'ExamGenie is an AI-powered study tool that helps you learn by transforming textbook images into interactive exams. Take exams, listen to audio summaries, and track your progress with our gamified reward system.',
    gettingStartedFirstExam: 'How to take your first exam',
    gettingStartedFirstExamContent:
      'Upload textbook images from your mobile app → Select a grade level and category → ExamGenie generates 15 questions → Open the exam link on your computer or phone → Answer the questions → Submit and view your results instantly.',
    gettingStartedResults: 'Understanding your results',
    gettingStartedResultsContent:
      'Your results show your score, grade breakdown, and detailed feedback for each question. You can retake the exam after 12 hours, or practice just the questions you got wrong. Every attempt helps you improve!',

    // Genie Dollars
    genieDollarsWhat: 'What are Genie Dollars?',
    genieDollarsWhatContent:
      "Genie Dollars are virtual rewards you earn by completing study activities. They're displayed in the badge at the top of your exam menu. While they're just for fun right now, they encourage consistent learning habits and spaced repetition.",
    genieDollarsHowToEarn: 'How to earn Genie Dollars',
    genieDollarsHowToEarnContent:
      '📝 Take an exam: +10 Genie Dollars (first time only per 12 hours)\n🎧 Listen to audio summary: +5 Genie Dollars (must listen to 80% of duration)\n🔄 Retake an exam: +5 Genie Dollars (after 12 hours have passed)\n\nYou can only earn once per activity per 12-hour period. This encourages spaced repetition, a proven study technique.',
    genieDollarsCooldown: 'Why the 12-hour cooldown?',
    genieDollarsCooldownContent:
      'The 12-hour waiting period between rewards is based on spaced repetition science. Returning to study material after a break helps you retain information better. It also prevents gaming the system by repeatedly taking the same exam.',
    genieDollarsAudioRequirement: 'Why do I need to listen to 80% of the audio?',
    genieDollarsAudioRequirementContent:
      "We require 80% listening to ensure you actually benefit from the audio summary. Quick skipping to the end won't count. This threshold balances rewards with genuine learning.",

    // Features
    featuresAudio: 'Audio Summary',
    featuresAudioContent:
      'Listen to an AI-generated overview of the exam material. The audio covers key concepts, important facts, and learning tips. Great for auditory learners or for preparing before taking the exam. Earn 5 Genie Dollars by listening to 80%+ of the audio.',
    featuresTakeExam: 'Take Exam',
    featuresTakeExamContent:
      'Answer 15 multiple-choice questions generated by AI from your textbook images. Each question has 4 answer options. You can navigate between questions and review before submitting. Once submitted, your answers cannot be changed. Earn 10 Genie Dollars on completion.',
    featuresViewResults: 'View Results',
    featuresViewResultsContent:
      'See your score, grade, and detailed feedback for each question. Results display in "Story Mode" - swipe or tap to navigate through your performance card by card. You can also switch to "Legacy" view for a traditional list layout.',
    featuresRetakeExam: 'Retake Full Exam',
    featuresRetakeExamContent:
      'Retake the entire exam after 12 hours to practice and improve. Your previous answer is shown in a bottom bar for reference. Unlimited retakes available. Earn 5 Genie Dollars each time.',
    featuresPracticeMistakes: 'Practice Mistakes',
    featuresPracticeMistakesContent:
      'Practice only the questions you got wrong on your first attempt. See your previous incorrect answer for reference. Perfect for focused review and targeted improvement without repeating questions you already know.',

    // Tips
    tipsAudioFirst: 'Listen to audio before taking the exam',
    tipsAudioFirstContent:
      'The audio summary gives you key concepts and context. Starting with audio helps you understand the material better and perform better on the exam.',
    tipsPracticeMistakes: 'Use Practice Mistakes for focused review',
    tipsPracticeMistakesContent:
      'After your first attempt, use the Practice Mistakes feature to drill weak areas. This targeted approach is more efficient than retaking the whole exam.',
    tipsStoryModeNav: 'Story Mode navigation shortcuts',
    tipsStoryModeNavContent:
      '← / → : Navigate between result cards\nSpace : Next card\nEsc : Exit\nTap left/right 30% of screen : Next/Previous\nSwipe left/right : Navigate (mobile)',
    tipsSpacedRepetition: 'Use spaced repetition for better retention',
    tipsSpacedRepetitionContent:
      'The 12-hour cooldown between rewards is intentional! Returning to study material after a break (spaced repetition) helps you retain information much longer than cramming.',

    // FAQ
    faqNoReward: "Why didn't I earn Genie Dollars?",
    faqNoRewardContent:
      "Common reasons:\n• 12-hour cooldown hasn't passed since your last attempt\n• For audio: You didn't listen to at least 80% of the duration\n• The activity counter resets every 12 hours\nCheck the badge status - it shows how many hours until the next reward is available.",
    faqRetakeVsPractice: "What's the difference between Retake and Practice Mistakes?",
    faqRetakeVsPracticeContent:
      '• Retake Full Exam: Answer all 15 questions again. Great for overall review and practice.\n• Practice Mistakes: Only answer the questions you got wrong. Great for focused improvement.\n\nBoth count toward your Genie Dollars rewards (if 12 hours have passed).',
    faqGrading: 'How is my exam graded?',
    faqGradingContent:
      'ExamGenie uses AI-powered grading to evaluate your answers and provide detailed feedback. Each question receives a score (correct, partial, or incorrect) based on your answer. Your final grade is calculated from the total points earned.',
    faqPartialCredit: 'Why did I get partial credit?',
    faqPartialCreditContent:
      "Some questions may have multiple valid interpretations or partially correct answers. The AI grader awards partial credit when your answer shows understanding but isn't completely correct or complete.",
    faqResultsColors: 'What do the colors in Story Mode results mean?',
    faqResultsColorsContent:
      '🟢 Green: Correct answer\n🟠 Orange: Partial credit\n🔴 Red: Incorrect answer\n\nEach card shows your answer, the correct answer, and feedback explaining the question.',
    faqRetakeAfterHours: 'Can I retake before 12 hours?',
    faqRetakeAfterHoursContent:
      "Yes! You can retake the exam anytime. However, you'll only earn Genie Dollars for the retake if at least 12 hours have passed since your last reward for that activity. You can still practice and review without earning rewards.",
    faqQuestionsSame: 'Are the questions the same every time?',
    faqQuestionsSameContent:
      'Yes, the 15 questions stay the same for each exam. This consistency helps you track your improvement when you retake the exam. Answer order may vary due to our answer shuffling algorithm.',
    faqLeaderboard: 'When is the Leaderboard coming?',
    faqLeaderboardContent:
      'The Leaderboard feature is coming soon! It will let you compare your scores with friends and classmates to add a friendly competitive element to studying.',
  },

  onboarding: {
    slide1Title: 'Welcome to Your Exam!',
    slide1Description: 'First time here? Let\'s show you around in 30 seconds. From the menu, you can listen to audio, take the exam, or view results.',
    slide2Title: 'Navigate Questions',
    slide2Description: 'Use the arrow buttons at the bottom to move between questions. You can go back anytime to change your answers.',
    slide3Title: 'Earn Genie Dollars',
    slide3Description: 'Complete exams and listen to audio summaries to earn Genie Dollars! Listen to 80% of audio for +5 dollars, complete exams for +10 dollars.',
    slide4Title: 'Submit & Get Results',
    slide4Description: 'Answer all questions, then tap Submit to see your results with detailed feedback!',
    gotIt: 'Start Exam 🚀',
    swipeHint: 'Swipe left/right or use buttons to navigate',
  },

  api: {
    errors: {
      userIdRequired: 'user_id or student_id required',
      rateLimitExceeded: 'Daily exam limit reached',
      rateLimitRetryAfter: 'You can create a new exam in {minutes} minutes.',
      invalidCategory:
        'Invalid category. Must be one of: mathematics, core_academics, language_studies',
      invalidSubject: 'Invalid subject. Must be one of the supported subjects.',
      invalidGrade: 'Invalid grade. Must be between 1 and 9.',
      fileProcessingFailed: 'File processing failed',
      examGenerationFailed: 'Exam generation failed',
      examNotFound: 'Exam not found',
      submissionFailed: 'Submission failed',
    },
  },
}
