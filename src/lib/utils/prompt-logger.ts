import { promises as fs } from 'fs'
import path from 'path'

export interface PromptLogMetadata {
  processingTime: number // in milliseconds
  promptTokens: number
  responseTokens: number
  totalTokens: number
  estimatedCost?: number
  examUrl?: string
  timestamp?: string
}

export interface ImageReference {
  filename: string
  sizeInBytes?: number
}

/**
 * Utility class for logging Gemini prompts and responses to text files
 * Only works in localhost development environment
 */
export class PromptLogger {
  private static readonly LOG_DIR = path.join(process.cwd(), 'prompttests')

  /**
   * Check if prompt logging is enabled
   * Only enabled when both conditions are met:
   * 1. Running on localhost (development)
   * 2. ENABLE_PROMPT_LOGGING is set to 'true'
   */
  static isEnabled(): boolean {
    const isLocalhost = process.env.NODE_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ||
                       !process.env.NEXT_PUBLIC_APP_URL // No URL means local

    const isEnabledInEnv = process.env.ENABLE_PROMPT_LOGGING === 'true'

    return isLocalhost && isEnabledInEnv
  }

  /**
   * Ensure the log directory exists
   */
  private static async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.LOG_DIR, { recursive: true })
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  /**
   * Format image references for logging (instead of actual image data)
   */
  private static formatImageReferences(images?: ImageReference[]): string {
    if (!images || images.length === 0) return ''

    return images.map((img, index) => {
      const size = img.sizeInBytes ? ` - ${(img.sizeInBytes / 1024).toFixed(0)}KB` : ''
      return `[IMAGE ${index + 1}: ${img.filename}${size}]`
    }).join('\n')
  }

  /**
   * Format metadata for footer
   */
  private static formatMetadata(metadata: PromptLogMetadata, type: string): string {
    const lines = [
      `${type.toUpperCase()} METADATA:`,
      `- Processing Time: ${(metadata.processingTime / 1000).toFixed(2)} seconds`,
      `- Prompt Tokens: ${metadata.promptTokens} | Response Tokens: ${metadata.responseTokens} | Total: ${metadata.totalTokens}`
    ]

    if (metadata.estimatedCost !== undefined) {
      lines.push(`- Cost: $${metadata.estimatedCost.toFixed(6)}`)
    }

    if (metadata.examUrl) {
      lines.push(`- Exam URL: ${metadata.examUrl}`)
    }

    return lines.join('\n')
  }

  /**
   * Log exam creation prompt and response
   */
  static async logExamCreation(
    examId: string,
    prompt: string,
    response: string,
    metadata: PromptLogMetadata,
    images?: ImageReference[],
    subject?: string,
    grade?: number
  ): Promise<void> {
    if (!this.isEnabled()) return

    try {
      await this.ensureLogDirectory()

      const filename = path.join(this.LOG_DIR, `exam-${examId}.txt`)
      const timestamp = new Date().toISOString()

      let content = '=== EXAM CREATION ===\n'
      content += `Timestamp: ${timestamp}\n`

      if (subject || grade || images) {
        const details = []
        if (subject) details.push(`Subject: ${subject}`)
        if (grade) details.push(`Grade: ${grade}`)
        if (images) details.push(`Images: ${images.length}`)
        content += details.join(' | ') + '\n'
      }

      content += '\nPROMPT:\n'

      // Add image references if present
      const imageRefs = this.formatImageReferences(images)
      if (imageRefs) {
        content += imageRefs + '\n\n'
      }

      content += prompt + '\n\n'
      content += 'RESPONSE:\n'
      content += response + '\n\n'
      content += this.formatMetadata(metadata, 'CREATION') + '\n'
      content += '\n' + '='.repeat(50) + '\n\n'

      await fs.writeFile(filename, content, 'utf-8')
      console.log(`✅ Logged exam creation to: ${filename}`)
    } catch (error) {
      console.error('Failed to log exam creation:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log grading prompt and response (append to existing file)
   */
  static async logGrading(
    examId: string,
    prompt: string,
    response: string,
    metadata: PromptLogMetadata,
    gradingType: 'BATCH' | 'FEEDBACK'
  ): Promise<void> {
    if (!this.isEnabled()) return

    try {
      await this.ensureLogDirectory()

      const filename = path.join(this.LOG_DIR, `exam-${examId}.txt`)
      const timestamp = new Date().toISOString()

      let content = `=== GRADING (${gradingType}) ===\n`
      content += `Timestamp: ${timestamp}\n\n`
      content += `${gradingType} PROMPT:\n`
      content += prompt + '\n\n'
      content += `${gradingType} RESPONSE:\n`
      content += response + '\n\n'
      content += this.formatMetadata(metadata, gradingType) + '\n'
      content += '\n' + '='.repeat(50) + '\n\n'

      await fs.appendFile(filename, content, 'utf-8')
      console.log(`✅ Logged ${gradingType.toLowerCase()} grading to: ${filename}`)
    } catch (error) {
      console.error(`Failed to log ${gradingType} grading:`, error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log total grading summary (append to existing file)
   */
  static async logGradingSummary(
    examId: string,
    totalTime: number,
    totalTokens: number,
    totalCost: number
  ): Promise<void> {
    if (!this.isEnabled()) return

    try {
      const filename = path.join(this.LOG_DIR, `exam-${examId}.txt`)

      let content = 'TOTAL GRADING SUMMARY:\n'
      content += `- Total Time: ${(totalTime / 1000).toFixed(2)} seconds\n`
      content += `- Total Tokens: ${totalTokens}\n`
      content += `- Total Cost: $${totalCost.toFixed(6)}\n`
      content += '\n' + '='.repeat(50) + '\n'

      await fs.appendFile(filename, content, 'utf-8')
    } catch (error) {
      console.error('Failed to log grading summary:', error)
    }
  }
}