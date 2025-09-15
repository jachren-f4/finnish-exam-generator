import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileMetadata } from '@/types'
import { GEMINI_CONFIG, PROMPTS, getGeminiApiKey } from '../config'
import { safeJsonParse } from '../utils/json-handler'
import { createUsageMetadata, CostTracker } from '../utils/cost-calculator'
import { GeminiLogger, OperationTimer } from '../utils/performance-logger'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())

export interface QuestionGenerationResult {
  rawText: string
  geminiUsage: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
}

export interface QuestionGenerationOptions {
  customPrompt?: string
}

/**
 * Question Generator Service - Handles exam question generation using Gemini AI
 * Extracted from gemini.ts to create focused question generation functionality
 */
export class QuestionGeneratorService {
  /**
   * Generate exam questions from images using Gemini AI
   */
  static async generateQuestionsFromImages(
    files: FileMetadata[], 
    options: QuestionGenerationOptions = {}
  ): Promise<QuestionGenerationResult | null> {
    const timer = new OperationTimer('Question Generation')
    
    try {
      // Build image parts for Gemini API
      timer.startPhase('Image Preparation')
      const imageParts = []
      
      for (const file of files) {
        const base64Data = file.base64Data
        if (!base64Data) {
          console.warn(`No base64 data found for file ${file.filename}`)
          continue
        }
        
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.mimeType
          }
        })
      }
      
      if (imageParts.length === 0) {
        console.error('No valid images found for question generation')
        return null
      }
      
      timer.endPhase('Image Preparation')
      
      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_CONFIG.MODEL_NAME,
        generationConfig: GEMINI_CONFIG.GENERATION_CONFIG
      })
      
      // Use custom prompt or default
      const promptToUse = options.customPrompt || PROMPTS.DEFAULT_EXAM_GENERATION
      
      // Make API request with retry logic for 503 errors
      timer.startPhase('Gemini API Call')
      GeminiLogger.logProcessPhase(`Sending API request to Gemini (prompt: ${promptToUse.length} chars)`)

      const result = await this.callGeminiWithRetry(model, [
        promptToUse,
        ...imageParts
      ])

      const text = result.response.text()
      const usageMetadata = result.response.usageMetadata

      timer.endPhase('Gemini API Call')
      GeminiLogger.logProcessPhase(`API response received: ${text.length} chars`)
      
      // Parse and process response
      timer.startPhase('Response Parsing')
      const parseResult = safeJsonParse(text)
      const responseText = parseResult.success ? JSON.stringify(parseResult.data, null, 2) : text
      timer.endPhase('Response Parsing')
      
      // Create usage metadata and track costs
      const usage = createUsageMetadata(promptToUse, text, usageMetadata)
      
      timer.complete({
        fileCount: files.length,
        promptLength: promptToUse.length,
        resultLength: responseText.length,
        parseMethod: parseResult.method || 'direct'
      })
      
      CostTracker.trackQuestionGenerationCost(usage)
      GeminiLogger.logProcessPhase(`Result: ${responseText.length} chars, ${usage.totalTokenCount} tokens, $${usage.estimatedCost.toFixed(6)}`)
      
      return {
        rawText: responseText,
        geminiUsage: usage
      }
      
    } catch (error) {
      console.error('Error in question generation:', error)
      return null
    }
  }

  /**
   * Call Gemini API with retry logic for handling 503 Service Unavailable errors
   */
  private static async callGeminiWithRetry(
    model: any,
    content: any[],
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Gemini API attempt ${attempt}/${maxRetries}`)
        const result = await model.generateContent(content)
        console.log(`✅ Gemini API call succeeded on attempt ${attempt}`)
        return result
      } catch (error: any) {
        lastError = error

        // Check if this is a 503 Service Unavailable error that we should retry
        const isRetryableError = error?.status === 503 ||
                                error?.message?.includes('overloaded') ||
                                error?.message?.includes('Service Unavailable') ||
                                error?.statusText === 'Service Unavailable'

        if (!isRetryableError || attempt === maxRetries) {
          console.error(`❌ Gemini API call failed on attempt ${attempt} (not retryable or max retries reached):`, {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            retryable: isRetryableError
          })
          throw error
        }

        // Calculate exponential backoff delay with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.warn(`⚠️  Gemini API overloaded (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`, {
          error: error?.message,
          status: error?.status,
          nextDelay: Math.round(delay)
        })

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }
}