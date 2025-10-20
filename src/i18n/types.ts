/**
 * i18n Type Definitions
 *
 * Defines the structure of translation files for type safety.
 * All locale files must match this structure.
 */

export type Locale = 'en' | 'fi'

export interface Translations {
  common: {
    loading: string
    error: string
    notFound: string
    retry: string
    loadFailed: string
    prev: string
    next: string
    submit: string
    cancel: string
    done: string
    backToMenu: string
  }

  examMenu: {
    title: string
    genieDollars: string
    audio: string
    exam: string
    results: string
    retake: string
    mistakes: string
    ranking: string
    help: string
    na: string
    pending: string
    view: string
    perfect: string
    soon: string
    learn: string
    gradeInfo: string // "Grade {grade} • {count} questions"
    questionsCount: string // "{count} Q"
    rewardAmount: string // "+{amount}"
  }

  examTaking: {
    title: string
    gradeInfo: string
    questionNumber: string // "{current} / {total}"
    yourAnswer: string
    true: string
    false: string
    confirmSubmit: string
    submitWarning: string
    sending: string
    noResults: string
    notGraded: string
    notGradedDesc: string
    start: string
  }

  examAudio: {
    title: string
    gradeInfo: string
    backToMenu: string
    summaryText: string
    play: string
    pause: string
    duration: string
    words: string // "{count} words"
    language: string
    earnedReward: string // "🎉 You earned {amount} Genie Dollars! 💵"
    listenThreshold: string // "⏰ Listen to at least {percent}% to earn"
    audioNotAvailable: string
  }

  examGrading: {
    title: string
    backToMenu: string
    printResults: string
    newExam: string
    correct: string
    partial: string
    incorrect: string
    total: string
    points: string // "{points} pts"
  }

  sharedExam: {
    loading: string
    notFound: string
    notFoundDetails: string
    title: string
    publicView: string
    print: string
    studentName: string
    created: string
    questions: string
    totalPoints: string
    examId: string
    instructions: string
    instruction1: string
    instruction2: string
    instruction3: string
    instruction4: string
    answerPlaceholder: string
    points: string // "{points} p"
    createdWith: string
    appName: string
    application: string
    printHeader: string
    printSubheader: string
  }

  help: {
    pageTitle: string
    backToMenu: string
    sectionGettingStarted: string
    sectionGenieDollars: string
    sectionFeatures: string
    sectionTips: string
    sectionFaq: string

    // Getting Started
    gettingStartedWhatIs: string
    gettingStartedWhatIsContent: string
    gettingStartedFirstExam: string
    gettingStartedFirstExamContent: string
    gettingStartedResults: string
    gettingStartedResultsContent: string

    // Genie Dollars
    genieDollarsWhat: string
    genieDollarsWhatContent: string
    genieDollarsHowToEarn: string
    genieDollarsHowToEarnContent: string
    genieDollarsCooldown: string
    genieDollarsCooldownContent: string
    genieDollarsAudioRequirement: string
    genieDollarsAudioRequirementContent: string

    // Features
    featuresAudio: string
    featuresAudioContent: string
    featuresTakeExam: string
    featuresTakeExamContent: string
    featuresViewResults: string
    featuresViewResultsContent: string
    featuresRetakeExam: string
    featuresRetakeExamContent: string
    featuresPracticeMistakes: string
    featuresPracticeMistakesContent: string

    // Tips
    tipsAudioFirst: string
    tipsAudioFirstContent: string
    tipsPracticeMistakes: string
    tipsPracticeMistakesContent: string
    tipsStoryModeNav: string
    tipsStoryModeNavContent: string
    tipsSpacedRepetition: string
    tipsSpacedRepetitionContent: string

    // FAQ
    faqNoReward: string
    faqNoRewardContent: string
    faqRetakeVsPractice: string
    faqRetakeVsPracticeContent: string
    faqGrading: string
    faqGradingContent: string
    faqPartialCredit: string
    faqPartialCreditContent: string
    faqResultsColors: string
    faqResultsColorsContent: string
    faqRetakeAfterHours: string
    faqRetakeAfterHoursContent: string
    faqQuestionsSame: string
    faqQuestionsSameContent: string
    faqLeaderboard: string
    faqLeaderboardContent: string
  }

  api: {
    errors: {
      userIdRequired: string
      rateLimitExceeded: string
      rateLimitRetryAfter: string // "You can create a new exam in {minutes} minutes"
      invalidCategory: string
      invalidSubject: string
      invalidGrade: string
      fileProcessingFailed: string
      examGenerationFailed: string
      examNotFound: string
      submissionFailed: string
    }
  }
}

export type TranslationKey = keyof Translations
export type NestedTranslationKey = {
  [K in keyof Translations]: keyof Translations[K] extends string
    ? `${K}.${keyof Translations[K] & string}`
    : never
}[keyof Translations]
