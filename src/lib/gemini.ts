import { CompressionSchema } from '@/types'

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
