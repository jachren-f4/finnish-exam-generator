/**
 * Finnish (FI) Translations
 * All user-facing text in Finnish
 */

export const fi = {
  common: {
    // Loading & Errors
    loading: 'Ladataan...',
    error: 'Virhe',
    notFound: 'Ei löytynyt',
    retry: 'Yritä uudelleen',
    loadFailed: 'Lataus epäonnistui',

    // Navigation
    prev: 'EDELLINEN',
    next: 'SEURAAVA',
    submit: 'LÄHETÄ',
    cancel: 'PERUUTA',

    // Actions
    save: 'Tallenna',
    delete: 'Poista',
    edit: 'Muokkaa',
    close: 'Sulje',

    // Status
    success: 'Onnistui',
    pending: 'Odottaa',
    completed: 'Valmis',

    // Progress
    questionOf: '/',
    progress: 'Edistyminen',
    done: 'Valmis',
    left: 'Jäljellä',

    // Question Types
    questionTypeMC: 'MC',
    questionTypeTF: 'T/E',
    questionTypeText: 'Teksti',
    questionTypeFill: 'Täydennä',

    // Answers
    true: 'Tosi',
    false: 'Epätosi',
    yourAnswer: 'Vastauksesi...',

    // Results
    correct: 'Oikein',
    partial: 'Osittain',
    incorrect: 'Väärin',
    total: 'Yhteensä',
    points: 'p',
    noResults: 'Ei tuloksia',
    notGraded: 'Ei vielä arvioitu',
    notGradedDesc: 'Tätä koetta ei ole vielä arvioitu.',

    // Submission
    confirmSubmit: 'Vahvista lähetys?',
    submitWarning: 'Lähetetäänkö vastaukset? Ei voi perua.',
    sending: 'Lähetetään...',

    // Modes
    retake: 'Uusinta',
    review: 'Tarkastele',
    start: 'Aloita',
    mode: 'Tila:',

    // General
    question: 'Kysymys',

    // Grading Results Page
    resultsTitle: 'Tulokset',
    gradeScale: 'Arvosana-asteikko:',
    answersByQuestion: 'Vastaukset',
    options: 'Vaihtoehdot:',
    yourAnswerLabel: 'Vastauksesi:',
    correctAnswerLabel: 'Oikea:',
    examInfo: 'Koeinfo',
    gradingInfo: 'Arviointiinfo',
    printResults: 'Tulosta',
    newExam: 'Uusi koe',
    created: 'Luotu:',
    submitted: 'Lähetetty:',
    graded: 'Arvioitu:',
    examId: 'Koe-ID:',
    notAvailable: 'Ei saatavilla',
    gradingMethod: 'Menetelmä:',
    aiGrading: 'AI',
    ruleBased: 'Säännöt',
    aiGraded: 'AI-arvioitu:',
    ruleBasedGraded: 'Sääntöarvioitu:',
    aiAvailable: 'AI saatavilla:',
    yes: 'Kyllä',
    no: 'Ei',
    aiUsage: 'AI-käyttö:',
    tokens: 'tokenia',
    estimatedCost: 'Arvioitu hinta:',
    questionsCount: 'kysymystä',

    // Time
    hours: 'tuntia',
    minutes: 'minuuttia',
    seconds: 'sekuntia',

    // Accessibility (ARIA labels)
    aria: {
      questionNavigation: 'Kysymysnavigaatio',
      progressBar: 'Kokeen edistyminen',
      submitDialog: 'Lähetyksen vahvistusikkuna',
      previousQuestion: 'Siirry edelliseen kysymykseen',
      nextQuestion: 'Siirry seuraavaan kysymykseen',
      submitAnswers: 'Lähetä kaikki vastaukset',
      cancelSubmission: 'Peruuta lähetys',
      questionType: 'Kysymyksen tyyppi',
      pointsValue: 'Pistearvo',
      answerOption: 'Vastausvaihtoehto',
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
