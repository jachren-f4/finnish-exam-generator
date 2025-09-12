import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileMetadata, CompressionSchema } from '@/types'
import { GEMINI_CONFIG, PROMPTS, getGeminiApiKey } from './config'
import { safeJsonParse, parseOcrResponse } from './utils/json-handler'
import { createUsageMetadata, CostTracker } from './utils/cost-calculator'
import { GeminiLogger, OperationTimer } from './utils/performance-logger'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())


export interface GeminiOCRResult {
  rawText: string
  compressed: CompressionSchema
  geminiUsage?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
}

export interface RawOCRResult {
  rawText: string
  usage: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
}




export async function extractRawTextFromImages(imageParts: any[]): Promise<RawOCRResult> {
  const timer = new OperationTimer('OCR Extraction')
  GeminiLogger.logOcrPhase(`Starting OCR extraction for ${imageParts.length} images`)
  
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_CONFIG.MODEL_NAME,
    generationConfig: GEMINI_CONFIG.GENERATION_CONFIG
  })
  
  const ocrPrompt = PROMPTS.OCR_EXTRACTION

  try {
    timer.startPhase('Gemini API Call')
    GeminiLogger.logOcrPhase(`Sending API request to Gemini (prompt: ${ocrPrompt.length} chars)`)
    
    const result = await model.generateContent([
      ocrPrompt,
      ...imageParts
    ])
    
    timer.endPhase('Gemini API Call')

    const response = await result.response
    const text = response.text()
    
    // Create usage metadata with cost calculation
    const usage = createUsageMetadata(ocrPrompt, text, response.usageMetadata)

    // Parse OCR response
    timer.startPhase('Response Parsing')
    const parseResult = parseOcrResponse(text)
    const rawText = parseResult.success && parseResult.data?.rawText ? parseResult.data.rawText : text
    timer.endPhase('Response Parsing')

    timer.complete({
      imageCount: imageParts.length,
      resultLength: rawText.length,
      parseMethod: parseResult.method || 'direct'
    })
    
    CostTracker.trackOcrCost(usage)
    GeminiLogger.logOcrPhase(`OCR result: ${rawText.length} chars, ${usage.totalTokenCount} tokens, $${usage.estimatedCost.toFixed(6)}`)
    
    return {
      rawText,
      usage
    }
  } catch (error) {
    throw new Error(`Raw OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function processImagesWithGemini(files: FileMetadata[], customPrompt?: string): Promise<GeminiOCRResult[]> {
  const timer = new OperationTimer('Question Generation')
  GeminiLogger.logProcessPhase(`Starting question generation for ${files.length} files`)
  GeminiLogger.logProcessPhase(`Custom prompt: ${customPrompt ? 'YES' : 'NO'} (${customPrompt?.length || 0} chars)`)
  
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_CONFIG.MODEL_NAME,
    generationConfig: GEMINI_CONFIG.GENERATION_CONFIG
  })
  
  try {
    // Prepare image parts for Gemini
    timer.startPhase('Image Loading')
    GeminiLogger.logProcessPhase(`Loading ${files.length} image files from disk`)
    const imageParts = []
    
    for (const file of files) {
      const fs = require('fs').promises
      const path = require('path')
      const filePath = path.join('/tmp', `${file.id}${path.extname(file.filename)}`)
      
      try {
        const imageBuffer = await fs.readFile(filePath)
        const base64Data = imageBuffer.toString('base64')
        
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.mimeType
          }
        })
      } catch (error) {
        throw new Error(`Failed to read file: ${file.filename}`)
      }
    }
    timer.endPhase('Image Loading')

    // Use custom prompt if provided, otherwise use default
    const promptToUse = customPrompt || PROMPTS.DEFAULT_EXAM_GENERATION

    // Send request to Gemini
    timer.startPhase('Gemini API Call')
    GeminiLogger.logProcessPhase(`Sending question generation request to Gemini`)
    GeminiLogger.logProcessPhase(`Final prompt length: ${promptToUse.length} chars`)
    
    const result = await model.generateContent([
      promptToUse,
      ...imageParts
    ])
    
    timer.endPhase('Gemini API Call')

    const response = await result.response
    const text = response.text()
    
    // Create usage metadata with cost calculation
    const usage = createUsageMetadata(promptToUse, text, response.usageMetadata)
    
    
    // Parse and validate JSON response
    timer.startPhase('Response Parsing')
    const parseResult = safeJsonParse(text)
    const responseText = parseResult.success ? JSON.stringify(parseResult.data, null, 2) : text
    timer.endPhase('Response Parsing')


    timer.complete({
      fileCount: files.length,
      promptLength: promptToUse.length,
      resultLength: responseText.length,
      parseMethod: parseResult.method || 'direct'
    })
    
    CostTracker.trackQuestionGenerationCost(usage)
    GeminiLogger.logProcessPhase(`Result: ${responseText.length} chars, ${usage.totalTokenCount} tokens, $${usage.estimatedCost.toFixed(6)}`)
    
    // Create simple results without compression
    return files.map(() => ({
      rawText: responseText,
      fullPromptUsed: promptToUse, // Add the actual enhanced prompt sent to Gemini
      compressed: {
        vocabulary: { tokens: [], phrases: [] },
        body: { segments: [] },
        stats: {
          originalLength: responseText.length,
          compressedLength: 0,
          compressionRatio: 0,
          tokenCount: 0,
          phraseCount: 0
        }
      },
      geminiUsage: usage
    }))
    
  } catch (error) {
    throw error
  }
}


export function validateCompressionSchema(compressed: any): boolean {
  try {
    return (
      compressed &&
      compressed.vocabulary &&
      Array.isArray(compressed.vocabulary.tokens) &&
      Array.isArray(compressed.vocabulary.phrases) &&
      compressed.body &&
      Array.isArray(compressed.body.segments) &&
      compressed.stats &&
      typeof compressed.stats.originalLength === 'number' &&
      typeof compressed.stats.compressedLength === 'number' &&
      typeof compressed.stats.compressionRatio === 'number' &&
      typeof compressed.stats.tokenCount === 'number' &&
      typeof compressed.stats.phraseCount === 'number'
    )
  } catch {
    return false
  }
}