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
      
      // Make API request
      timer.startPhase('Gemini API Call')
      GeminiLogger.logProcessPhase(`Sending API request to Gemini (prompt: ${promptToUse.length} chars)`)
      
      const result = await model.generateContent([
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
}