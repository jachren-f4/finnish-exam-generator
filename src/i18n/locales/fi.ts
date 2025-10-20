/**
 * Finnish (fi) Translations
 *
 * Contains all Finnish text for the ExamGenie application.
 * Translated from English (en.ts) and existing Finnish strings in codebase.
 */

import type { Translations } from '../types'

export const fi: Translations = {
  common: {
    loading: 'Ladataan...',
    error: 'Virhe',
    notFound: 'Ei löytynyt',
    retry: 'Yritä uudelleen',
    loadFailed: 'Lataus epäonnistui',
    prev: 'Edellinen',
    next: 'Seuraava',
    submit: 'Lähetä',
    cancel: 'Peruuta',
    done: 'Valmis',
    backToMenu: 'Takaisin valikkoon',
  },

  examMenu: {
    title: 'ExamGenie',
    genieDollars: 'Genie-dollarit',
    audio: 'Audio',
    exam: 'Koe',
    results: 'Tulokset',
    retake: 'Uusintakoe',
    mistakes: 'Virheet',
    ranking: 'Sijoitus',
    help: 'Ohje',
    na: 'Ei saatavilla',
    pending: 'Odottaa',
    view: 'Näytä',
    perfect: 'Täydellinen!',
    soon: 'Tulossa',
    learn: 'Opi',
    gradeInfo: 'Luokka {grade} • {count} kysymystä',
    questionsCount: '{count} kysymystä',
    rewardAmount: '+{amount}',
    audioDescription: 'Kuuntele yleiskatsaus materiaalista ennen kokeen aloittamista',
    startExam: 'Aloita koe',
    resultsDescription: 'Katso kokeesi tulokset ja palaute',
    resultsLocked: 'Suorita koe nähdäksesi tulokset',
    viewResults: 'Katso tulokset',
    retakeFullExam: 'Uusi koko koe',
    retakeDescription: 'Harjoittele uudelleen kaikilla kysymyksillä',
    retakeLocked: 'Suorita koe ensin avataksesi uusintamahdollisuuden',
    startRetake: 'Aloita uusinta',
    practiceMistakes: 'Harjoittele virheitä',
    reviewWrongQuestions: 'Tarkista {count} väärin mennyt kysymys',
    perfectScore: 'Täydellinen tulos! Ei virheitä harjoiteltavaksi',
    mistakesLocked: 'Suorita koe nähdäksesi virheesi',
    practiceNow: 'Harjoittele nyt',
    rankingComingSoon: 'Tulossa pian - kilpaile muiden opiskelijoiden kanssa',
    helpFaq: 'Ohje ja UKK',
    helpDescription: 'Opi ExamGenien, Genie-dollareiden käytöstä ja vastaukset yleisiin kysymyksiin',
    viewHelp: 'Katso ohje',
  },

  examTaking: {
    title: 'Tee koe',
    gradeInfo: 'Luokka {grade} • {count} kysymystä',
    questionNumber: '{current} / {total}',
    yourAnswer: 'Vastauksesi...',
    true: 'Tosi',
    false: 'Epätosi',
    confirmSubmit: 'Vahvista lähetys?',
    submitWarning: 'Lähetä vastaukset? Ei voi perua.',
    sending: 'Lähetetään...',
    noResults: 'Ei tuloksia',
    notGraded: 'Ei vielä arvosteltu',
    notGradedDesc: 'Tätä koetta ei ole vielä arvosteltu.',
    start: 'Aloita',
  },

  examAudio: {
    title: 'Ääniyhteenveto',
    gradeInfo: 'Luokka {grade} • Ääniyhtee nveto',
    backToMenu: 'Takaisin valikkoon',
    summaryText: 'Yhteenvetoteksti',
    play: 'Toista',
    pause: 'Keskeytä',
    duration: 'Kesto:',
    words: '{count} sanaa',
    language: '{language}',
    earnedReward: '🎉 Ansaitsit {amount} Genie-dollaria! 💵',
    listenThreshold: '⏰ Kuuntele vähintään {percent}% ansaitaksesi Genie-dollareita',
    audioNotAvailable: 'Ääniyhteenveto ei saatavilla tälle kokeelle',
  },

  examGrading: {
    title: 'ExamGenie',
    backToMenu: 'Takaisin valikkoon',
    printResults: 'Tulosta',
    newExam: 'Uusi koe',
    correct: 'Oikein',
    partial: 'Osittain oikein',
    incorrect: 'Väärin',
    total: 'Yhteensä',
    points: '{points} p',
  },

  sharedExam: {
    loading: 'Ladataan koetta...',
    notFound: 'Koetta ei löytynyt',
    notFoundDetails:
      'Tarkista linkki tai ota yhteyttä henkilöön, joka jakoi tämän kokeen kanssasi.',
    title: 'Jaettu koe',
    publicView: 'Julkinen näkymä',
    print: 'Tulosta',
    studentName: 'Oppilaan nimi:',
    created: 'Luotu:',
    questions: 'Kysymyksiä:',
    totalPoints: 'Pisteitä yhteensä:',
    examId: 'Koe-ID:',
    instructions: 'Ohjeet',
    instruction1: 'Lue jokainen kysymys huolellisesti',
    instruction2: 'Vastaa kaikkiin kysymyksiin',
    instruction3: 'Monivalintakysymyksissä valitse paras vastaus',
    instruction4: 'Kirjoita vastaukset selkeästi ja luettavasti',
    answerPlaceholder: 'Kirjoita vastauksesi tähän...',
    points: '{points} p',
    createdWith: 'Luotu',
    appName: 'ExamGenie',
    application: '-sovelluksella',
    printHeader: 'ExamGenie',
    printSubheader: 'Automaattisesti luotu koe',
  },

  help: {
    pageTitle: 'Ohje ja UKK',
    backToMenu: 'Takaisin valikkoon',
    sectionGettingStarted: 'Aloittaminen',
    sectionGenieDollars: 'Genie-dollarit',
    sectionFeatures: 'Ominaisuudet',
    sectionTips: 'Vinkit ja pikanäppäimet',
    sectionFaq: 'Usein kysytyt kysymykset',

    // Getting Started
    gettingStartedWhatIs: 'Mikä on ExamGenie?',
    gettingStartedWhatIsContent:
      'ExamGenie on tekoälyavusteinen oppimisvälne, joka auttaa sinua oppimaan muuttamalla oppikirjasi kuvat vuorovaikutteisiksi kokeiksi. Tee kokeita, kuuntele ääniyhteenvetoja ja seuraa edistymistäsi pelillistetyn palkintojärjestelmämme avulla.',
    gettingStartedFirstExam: 'Kuinka tehdä ensimmäinen koe',
    gettingStartedFirstExamContent:
      'Lataa oppikirjan kuvia mobiilisovelluksesta → Valitse luokka-aste ja kategoria → ExamGenie luo 15 kysymystä → Avaa koelinkki tietokoneellasi tai puhelimellasi → Vastaa kysymyksiin → Lähetä ja tarkastele tuloksia heti.',
    gettingStartedResults: 'Tulosten ymmärtäminen',
    gettingStartedResultsContent:
      'Tuloksesi näyttävät pisteesi, arvosanan ja yksityiskohtaisen palautteen jokaisesta kysymyksestä. Voit uusia kokeen 12 tunnin kuluttua tai harjoitella vain väärin vastaamasi kysymykset. Jokainen yritys auttaa sinua parantamaan!',

    // Genie Dollars
    genieDollarsWhat: 'Mitä ovat Genie-dollarit?',
    genieDollarsWhatContent:
      'Genie-dollarit ovat virtuaalisia palkintoja, joita ansaitset suorittamalla opiskelutoimintoja. Ne näytetään merkissä kokeen valikon yläreunassa. Vaikka ne ovat tällä hetkellä vain hauskoja, ne kannustavat johdonmukaisiin opiskelutottumuksiin ja väliajoin toistamiseen.',
    genieDollarsHowToEarn: 'Kuinka ansaita Genie-dollareita',
    genieDollarsHowToEarnContent:
      '📝 Tee koe: +10 Genie-dollaria (ensimmäinen kerta 12 tunnin välein)\n🎧 Kuuntele ääniyhteenveto: +5 Genie-dollaria (täytyy kuunnella 80% kestosta)\n🔄 Uusi koe: +5 Genie-dollaria (12 tunnin kuluttua)\n\nVoit ansaita vain kerran toimintoa kohden 12 tunnin aikana. Tämä kannustaa väliajoin toistamiseen, todistettuun opiskelutekniikkaan.',
    genieDollarsCooldown: 'Miksi 12 tunnin odotusaika?',
    genieDollarsCooldownContent:
      '12 tunnin odotusaika palkintojen välillä perustuu väliajoin toistamisen tieteeseen. Palaaminen opiskelumateriaaliin tauon jälkeen auttaa sinua muistamaan tiedot paremmin. Se myös estää järjestelmän väärinkäytön toistamalla samaa koetta.',
    genieDollarsAudioRequirement: 'Miksi minun täytyy kuunnella 80% äänestä?',
    genieDollarsAudioRequirementContent:
      'Vaaditaan 80% kuuntelua varmistaaksemme, että hyödyt todella ääniyhteenvedosta. Nopea ohitus loppuun ei kelpaa. Tämä raja tasapainottaa palkinnot aidon oppimisen kanssa.',

    // Features
    featuresAudio: 'Ääniyhteenveto',
    featuresAudioContent:
      'Kuuntele tekoälyn luoma yleiskatsaus koemateriaalista. Ääni kattaa keskeiset käsitteet, tärkeät tosiasiat ja oppimisvinkit. Loistava auditiivinen oppija tai valmistautuminen ennen kokeen tekemistä. Ansaitse 5 Genie-dollaria kuuntelemalla 80%+ äänestä.',
    featuresTakeExam: 'Tee koe',
    featuresTakeExamContent:
      'Vastaa 15 monivalintakysymykseen, jotka tekoäly on luonut oppikirjasi kuvista. Jokaisessa kysymyksessä on 4 vastausvaihtoehtoa. Voit navigoida kysymysten välillä ja tarkistaa ennen lähettämistä. Kerran lähetettynä vastauksiasi ei voi muuttaa. Ansaitse 10 Genie-dollaria suorittamalla.',
    featuresViewResults: 'Näytä tulokset',
    featuresViewResultsContent:
      'Katso pisteesi, arvosanasi ja yksityiskohtainen palaute jokaisesta kysymyksestä. Tulokset näytetään "Tarinatilassa" - pyyhkäise tai napauta navigoidaksesi suorituksesi korttien läpi. Voit myös vaihtaa "Perinteiseen" näkymään perinteistä luettelonäkymää varten.',
    featuresRetakeExam: 'Uusi koe kokonaan',
    featuresRetakeExamContent:
      'Uusi koko koe 12 tunnin kuluttua harjoitellaksesi ja parantaaksesi. Edellinen vastauksesi näytetään alapalkissa viitteenä. Rajattomat uusinnat saatavilla. Ansaitse 5 Genie-dollaria joka kerta.',
    featuresPracticeMistakes: 'Harjoittele virheitä',
    featuresPracticeMistakesContent:
      'Harjoittele vain kysymyksiä, joihin vastasit väärin ensimmäisellä yrityksellä. Katso edellinen virheellinen vastauksesi viitteenä. Täydellinen kohdennetulle tarkastelulle ja kohdennetulle parantamiselle toistamatta kysymyksiä, jotka jo tiedät.',

    // Tips
    tipsAudioFirst: 'Kuuntele ääni ennen kokeen tekemistä',
    tipsAudioFirstContent:
      'Ääniyhteenveto antaa sinulle keskeiset käsitteet ja kontekstin. Aloittaminen äänellä auttaa sinua ymmärtämään materiaalin paremmin ja suoriutumaan paremmin kokeessa.',
    tipsPracticeMistakes: 'Käytä virheiden harjoittelua kohdennettuun tarkasteluun',
    tipsPracticeMistakesContent:
      'Ensimmäisen yrityksen jälkeen käytä virheiden harjoittelua porataksesi heikkoja alueita. Tämä kohdennettu lähestymistapa on tehokkaampi kuin koko kokeen uusiminen.',
    tipsStoryModeNav: 'Tarinatilan navigointipikanäppäimet',
    tipsStoryModeNavContent:
      '← / → : Navigoi tuloskorttien välillä\nVälilyönti : Seuraava kortti\nEsc : Poistu\nNapauta vasenta/oikeaa 30% näytöstä : Seuraava/Edellinen\nPyyhkäise vasemmalle/oikealle : Navigoi (mobiili)',
    tipsSpacedRepetition: 'Käytä väliajoin toistamista parempaan muistamiseen',
    tipsSpacedRepetitionContent:
      '12 tunnin odotusaika palkintojen välillä on tarkoituksellinen! Palaaminen opiskelumateriaaliin tauon jälkeen (väliajoin toistaminen) auttaa sinua muistamaan tiedot paljon pidempään kuin tenttaaminen.',

    // FAQ
    faqNoReward: 'Miksi en ansainnut Genie-dollareita?',
    faqNoRewardContent:
      'Yleisiä syitä:\n• 12 tunnin odotusaika ei ole kulunut viimeisestä yrityksestäsi\n• Äänelle: Et kuunnellut vähintään 80% kestosta\n• Toimintalaskuri nollautuu 12 tunnin välein\nTarkista merkin tila - se näyttää kuinka monta tuntia seuraavaan palkintoon on aikaa.',
    faqRetakeVsPractice: 'Mikä on ero uusintakokeen ja virheiden harjoittelun välillä?',
    faqRetakeVsPracticeContent:
      '• Uusi koe kokonaan: Vastaa kaikki 15 kysymystä uudelleen. Loistava yleiseen tarkasteluun ja harjoitteluun.\n• Harjoittele virheitä: Vastaa vain kysymyksiin, joihin vastasit väärin. Loistava kohdennettuun parantamiseen.\n\nMolemmat lasketaan Genie-dollaripalkintoihisi (jos 12 tuntia on kulunut).',
    faqGrading: 'Kuinka kokeeni arvostellaan?',
    faqGradingContent:
      'ExamGenie käyttää tekoälyavusteista arvostelemista arvioidakseen vastauksesi ja antaakseen yksityiskohtaista palautetta. Jokainen kysymys saa pistemäärän (oikein, osittain oikein tai väärin) vastauksesi perusteella. Lopullinen arvosanasi lasketaan ansaitsemistasi kokonaispisteistä.',
    faqPartialCredit: 'Miksi sain osittain oikein?',
    faqPartialCreditContent:
      'Joillakin kysymyksillä voi olla useita kelvollisia tulkintoja tai osittain oikeita vastauksia. Tekoälyarvostelija myöntää osittain oikein, kun vastauksesi osoittaa ymmärrystä, mutta ei ole täysin oikea tai täydellinen.',
    faqResultsColors: 'Mitä värit tarinatilan tuloksissa tarkoittavat?',
    faqResultsColorsContent:
      '🟢 Vihreä: Oikea vastaus\n🟠 Oranssi: Osittain oikein\n🔴 Punainen: Väärä vastaus\n\nJokainen kortti näyttää vastauksesi, oikean vastauksen ja palautteen selittäen kysymyksen.',
    faqRetakeAfterHours: 'Voinko uusia ennen 12 tuntia?',
    faqRetakeAfterHoursContent:
      'Kyllä! Voit uusia kokeen milloin tahansa. Ansaitset kuitenkin Genie-dollareita uusinnasta vain, jos vähintään 12 tuntia on kulunut viimeisestä palkinnosta tälle toiminnolle. Voit silti harjoitella ja tarkistaa ansaitsematta palkintoja.',
    faqQuestionsSame: 'Ovatko kysymykset samat joka kerta?',
    faqQuestionsSameContent:
      'Kyllä, 15 kysymystä pysyvät samoina jokaisessa kokeessa. Tämä johdonmukaisuus auttaa sinua seuraamaan parantumistasi, kun uusit kokeen. Vastausten järjestys voi vaihdella vastausten sekoitusalgoritmimme vuoksi.',
    faqLeaderboard: 'Milloin tulostaulukko tulee?',
    faqLeaderboardContent:
      'Tulostaulukko-ominaisuus tulee pian! Se antaa sinun vertailla tuloksiasi ystäviin ja luokkatovereihin lisätäksesi ystävällistä kilpailuhenkeä opiskeluun.',
  },

  onboarding: {
    slide1Title: 'Tervetuloa kokeeseen!',
    slide1Description: 'Ensimmäistä kertaa täällä? Näytetään sinulle 30 sekunnissa. Valikosta voit kuunnella ääntä, suorittaa kokeen tai tarkastella tuloksia.',
    slide2Title: 'Selaa kysymyksiä',
    slide2Description: 'Käytä alareunassa olevia nuolipainikkeita siirtyäksesi kysymysten välillä. Voit palata takaisin muuttaaksesi vastauksiasi.',
    slide3Title: 'Ansaitse Genie-dollareita',
    slide3Description: 'Suorita kokeita ja kuuntele ääniyhteenvetoja ansaitaksesi Genie-dollareita! Kuuntele 80% äänestä saadaksesi +5 dollaria, suorita kokeita saadaksesi +10 dollaria.',
    slide4Title: 'Lähetä ja saa tulokset',
    slide4Description: 'Vastaa kaikkiin kysymyksiin ja paina sitten Lähetä nähdäksesi tuloksesi yksityiskohtaisen palautteen kera!',
    gotIt: 'Aloita koe 🚀',
    swipeHint: 'Pyyhkäise vasemmalle/oikealle tai käytä painikkeita',
  },

  api: {
    errors: {
      userIdRequired: 'user_id tai student_id vaaditaan',
      rateLimitExceeded: 'Päivittäinen koeraja saavutettu',
      rateLimitRetryAfter: 'Voit luoda uuden kokeen {minutes} minuutin kuluttua.',
      invalidCategory:
        'Virheellinen kategoria. Sallitut: mathematics, core_academics, language_studies',
      invalidSubject: 'Virheellinen oppiaine. Käytä tuettuja oppiaineita.',
      invalidGrade: 'Virheellinen luokka-aste. Tulee olla välillä 1-9.',
      fileProcessingFailed: 'Tiedoston käsittely epäonnistui',
      examGenerationFailed: 'Kokeen luominen epäonnistui',
      examNotFound: 'Koetta ei löytynyt',
      submissionFailed: 'Lähetys epäonnistui',
    },
  },
}
