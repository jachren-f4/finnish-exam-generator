import { FileMetadata, CompressionSchema } from '@/types'
import { OcrService } from './services/ocr-service'
import { QuestionGeneratorService } from './services/question-generator-service'


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
  // Convert imageParts to FileMetadata format for the service
  const fileMetadata: FileMetadata[] = imageParts.map((part, index) => ({
    id: `temp-${index}`,
    filename: `image-${index}.jpg`,
    mimeType: part.inlineData.mimeType || 'image/jpeg',
    size: 0, // Not needed for this operation
    uploadedAt: new Date(), // Required field
    base64Data: part.inlineData.data
  }))

  const result = await OcrService.extractTextFromImages(fileMetadata)
  if (!result) {
    throw new Error('OCR extraction failed')
  }

  return {
    rawText: result.rawText,
    usage: result.geminiUsage
  }
}

export async function processImagesWithGemini(files: FileMetadata[], customPrompt?: string): Promise<GeminiOCRResult[]> {
  // Load base64 data for files that need it
  const filesWithData = await Promise.all(files.map(async (file) => {
    if (file.base64Data) {
      return file
    }
    
    // Load from disk if base64Data is not available
    const fs = require('fs').promises
    const path = require('path')
    const filePath = path.join('/tmp', `${file.id}${path.extname(file.filename)}`)
    
    try {
      const imageBuffer = await fs.readFile(filePath)
      const base64Data = imageBuffer.toString('base64')
      
      return {
        ...file,
        base64Data
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${file.filename}`)
    }
  }))

  const result = await QuestionGeneratorService.generateQuestionsFromImages(filesWithData, {
    customPrompt
  })

  if (!result) {
    throw new Error('Question generation failed')
  }

  // Create results in expected format
  return files.map(() => ({
    rawText: result.rawText,
    fullPromptUsed: customPrompt || 'Default prompt used',
    compressed: {
      vocabulary: { tokens: [], phrases: [] },
      body: { segments: [] },
      stats: {
        originalLength: result.rawText.length,
        compressedLength: 0,
        compressionRatio: 0,
        tokenCount: 0,
        phraseCount: 0
      }
    },
    geminiUsage: result.geminiUsage
  }))
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