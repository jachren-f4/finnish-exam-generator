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

}