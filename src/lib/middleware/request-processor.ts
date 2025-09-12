import { NextRequest } from 'next/server'
import { FileProcessor } from '../utils/file-handler'
import { OperationTimer } from '../utils/performance-logger'

export interface ProcessedFormData {
  customPrompt?: string
  images: File[]
  metadata: {
    imageCount: number
    totalSize: number
    promptType: 'custom' | 'default'
    processingId: string
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Request Processing Middleware - Handles common request validation and processing
 * Extracted from API routes to provide consistent request handling
 */
export class RequestProcessor {
  /**
   * Process form data from mobile API requests
   */
  static async processFormData(
    request: NextRequest,
    timer: OperationTimer,
    processingId: string
  ): Promise<ProcessedFormData> {
    timer.startPhase('Form Data Parsing')
    
    try {
      const formData = await request.formData()
      const customPrompt = formData.get('prompt') as string
      const images = formData.getAll('images') as File[]
      
      timer.endPhase('Form Data Parsing')
      
      // Calculate metadata
      const totalSize = images.reduce((sum, file) => sum + file.size, 0)
      const promptType = customPrompt && customPrompt.trim() !== '' ? 'custom' : 'default'
      
      console.log('Received custom prompt:', promptType === 'custom' ? 'YES' : 'NO')
      console.log('Number of images received:', images.length)
      console.log('Total size:', Math.round(totalSize / 1024 / 1024), 'MB')
      
      return {
        customPrompt,
        images,
        metadata: {
          imageCount: images.length,
          totalSize,
          promptType,
          processingId
        }
      }
    } catch (error) {
      timer.endPhase('Form Data Parsing')
      throw new Error(`Failed to process form data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate uploaded images using FileProcessor
   */
  static validateImages(images: File[]): ValidationResult {
    console.log('=== IMAGE VALIDATION START ===')
    
    if (images.length === 0) {
      return {
        valid: false,
        errors: ['No images provided'],
        warnings: []
      }
    }
    
    const validation = FileProcessor.validate(images)
    
    if (!validation.valid) {
      console.log('Validation failed:', validation.errors)
      return {
        valid: false,
        errors: validation.errors,
        warnings: validation.warnings
      }
    }
    
    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('File validation warnings:', validation.warnings)
    }
    
    console.log('=== IMAGE VALIDATION PASSED ===')
    return validation
  }

  /**
   * Log request details for debugging and monitoring
   */
  static logRequest(
    processedData: ProcessedFormData,
    additionalInfo?: Record<string, any>
  ): void {
    console.log('=== MOBILE API REQUEST DETAILS ===')
    console.log('Processing ID:', processedData.metadata.processingId)
    console.log('Image count:', processedData.metadata.imageCount)
    console.log('Total size:', Math.round(processedData.metadata.totalSize / 1024 / 1024), 'MB')
    console.log('Prompt type:', processedData.metadata.promptType.toUpperCase())
    console.log('Processing mode: LEGACY (Standard)')
    
    if (additionalInfo) {
      Object.entries(additionalInfo).forEach(([key, value]) => {
        console.log(`${key}:`, value)
      })
    }
    
    console.log('=== END REQUEST DETAILS ===')
  }

  /**
   * Validate request method
   */
  static validateMethod(request: NextRequest, allowedMethods: string[]): boolean {
    return allowedMethods.includes(request.method)
  }

  /**
   * Check if request has required headers
   */
  static validateHeaders(request: NextRequest, requiredHeaders: string[] = []): ValidationResult {
    const missing = requiredHeaders.filter(header => !request.headers.get(header))
    
    return {
      valid: missing.length === 0,
      errors: missing.map(header => `Missing required header: ${header}`),
      warnings: []
    }
  }

  /**
   * Extract client information for logging
   */
  static getClientInfo(request: NextRequest): Record<string, string> {
    return {
      userAgent: request.headers.get('user-agent') || 'unknown',
      origin: request.headers.get('origin') || 'unknown',
      referer: request.headers.get('referer') || 'none',
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    }
  }
}