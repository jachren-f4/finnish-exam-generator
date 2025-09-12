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
      
      // Make API request
      timer.startPhase('Gemini API Call')
      GeminiLogger.logOcrPhase(`Sending API request to Gemini (prompt: ${ocrPrompt.length} chars)`)
      
      const result = await model.generateContent([
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
}