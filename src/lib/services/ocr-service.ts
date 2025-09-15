import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileMetadata } from '@/types'
import { GEMINI_CONFIG, PROMPTS, getGeminiApiKey } from '../config'
import { parseOcrResponse } from '../utils/json-handler'
import { createUsageMetadata, CostTracker } from '../utils/cost-calculator'
import { GeminiLogger, OperationTimer } from '../utils/performance-logger'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())

export interface OcrResult {
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

/**
 * OCR Service - Handles text extraction from images using Gemini Vision API
 * Extracted from gemini.ts to create focused OCR functionality
 */
export class OcrService {
  /**
   * Extract raw text from images using Gemini OCR
   */
  static async extractTextFromImages(files: FileMetadata[]): Promise<OcrResult | null> {
    const timer = new OperationTimer('OCR Text Extraction')
    
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
        console.error('No valid images found for OCR processing')
        return null
      }
      
      timer.endPhase('Image Preparation')
      
      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_CONFIG.MODEL_NAME,
        generationConfig: GEMINI_CONFIG.GENERATION_CONFIG
      })
      
      const ocrPrompt = PROMPTS.OCR_EXTRACTION
      
      // Make API request with retry logic for 503 errors
      timer.startPhase('Gemini API Call')
      GeminiLogger.logOcrPhase(`Sending API request to Gemini (prompt: ${ocrPrompt.length} chars)`)

      const result = await this.callGeminiWithRetry(model, [
        ocrPrompt,
        ...imageParts
      ])

      const text = result.response.text()
      const usageMetadata = result.response.usageMetadata

      timer.endPhase('Gemini API Call')
      GeminiLogger.logOcrPhase(`API response received: ${text.length} chars`)
      
      // Parse and process response
      timer.startPhase('Response Parsing')
      const parseResult = parseOcrResponse(text)
      const rawText = parseResult.success && parseResult.data?.rawText ? parseResult.data.rawText : text
      timer.endPhase('Response Parsing')
      
      // Create usage metadata and track costs
      const usage = createUsageMetadata(ocrPrompt, text, usageMetadata)
      
      timer.complete({
        imageCount: imageParts.length,
        resultLength: rawText.length,
        parseMethod: parseResult.method || 'direct'
      })
      
      CostTracker.trackOcrCost(usage)
      GeminiLogger.logOcrPhase(`OCR result: ${rawText.length} chars, ${usage.totalTokenCount} tokens, $${usage.estimatedCost.toFixed(6)}`)
      
      return {
        rawText,
        geminiUsage: usage
      }
      
    } catch (error) {
      console.error('Error in OCR text extraction:', error)
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
        console.log(`🔄 Gemini OCR API attempt ${attempt}/${maxRetries}`)
        const result = await model.generateContent(content)
        console.log(`✅ Gemini OCR API call succeeded on attempt ${attempt}`)
        return result
      } catch (error: any) {
        lastError = error

        // Check if this is a 503 Service Unavailable error that we should retry
        const isRetryableError = error?.status === 503 ||
                                error?.message?.includes('overloaded') ||
                                error?.message?.includes('Service Unavailable') ||
                                error?.statusText === 'Service Unavailable'

        if (!isRetryableError || attempt === maxRetries) {
          console.error(`❌ Gemini OCR API call failed on attempt ${attempt} (not retryable or max retries reached):`, {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            retryable: isRetryableError
          })
          throw error
        }

        // Calculate exponential backoff delay with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.warn(`⚠️  Gemini OCR API overloaded (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`, {
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