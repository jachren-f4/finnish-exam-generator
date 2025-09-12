export interface FileMetadata {
  id: string
  filename: string
  mimeType: string
  size: number
  width?: number
  height?: number
  uploadedAt: Date
  base64Data?: string
}

export interface CompressionSchema {
  vocabulary: {
    tokens: string[]
    phrases: string[]
  }
  body: {
    segments: Array<{
      type: 't' | 'p' | 'raw' | 'nl'
      ref?: number
      content?: string
    }>
  }
  stats: {
    originalLength: number
    compressedLength: number
    compressionRatio: number
    tokenCount: number
    phraseCount: number
  }
}

export interface GeminiUsage {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
  estimatedCost: number
  inputCost: number
  outputCost: number
  model: string
}

export interface OCRResult {
  fileId: string
  rawText: string
  compressed: CompressionSchema
  processingTime: number
  geminiUsage?: GeminiUsage
}

export interface Job {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  files: FileMetadata[]
  results?: OCRResult[]
  error?: string
  createdAt: Date
  completedAt?: Date
  customPrompt?: string
}

export interface JSONLExport {
  userId: string
  stage: string
  fileId: string
  filename: string
  rawText: string
  compressed: CompressionSchema
  timestamp: string
}