// Language service for exam generation
export class LanguageService {
  private static languages: Record<string, string> = {
    'en': 'English',
    'fi': 'Finnish',
    'sv': 'Swedish',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'et': 'Estonian',
    'no': 'Norwegian',
    'da': 'Danish',
    'nl': 'Dutch'
  }

  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    return Object.entries(this.languages).map(([code, name]) => ({
      code,
      name
    }))
  }

  static getLanguageName(code: string): string {
    return this.languages[code] || 'English'
  }

  static isValidLanguage(code: string): boolean {
    return code in this.languages
  }

  static adaptExamPrompt(basePrompt: string, studentLanguage: string, grade: number): string {
    const languageName = this.getLanguageName(studentLanguage)

    // Replace language placeholders in the prompt
    return basePrompt
      .replace(/{LANGUAGE}/g, studentLanguage)
      .replace(/{LANGUAGE_NAME}/g, languageName)
      .replace(/{GRADE}/g, grade.toString())
  }

  static generateGradingPrompt(
    studentLanguage: string,
    grade: number,
    score: number,
    correctQuestions: string[],
    incorrectQuestions: string[],
    materialSummary: string
  ): string {
    const languageName = this.getLanguageName(studentLanguage)

    return `
Based on the student's exam performance, generate complete personalized feedback:

Student Performance: ${score}/10
Language: ${languageName} (${studentLanguage})
Grade Level: ${grade}
Questions Answered Correctly: ${correctQuestions.join(', ')}
Questions Answered Incorrectly: ${incorrectQuestions.join(', ')}
Subject Material Summary: ${materialSummary}

Generate a complete, self-contained feedback narrative that includes:
- What the student did well (specific strengths with examples from correct answers)
- Areas that need improvement (specific gaps based on incorrect answers)
- Why these areas are important for their learning
- Concrete steps to improve
- Encouragement appropriate for their age

IMPORTANT:
- Write the ENTIRE feedback in ${languageName}
- The output should be 3-5 paragraphs of natural, flowing text
- Do not use bullet points or structured sections
- Write as if speaking directly to the student
- Make it age-appropriate for grade ${grade}
- Use encouraging and supportive tone

Return only the feedback text in ${languageName}, no labels or sections.`
  }
}