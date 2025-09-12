/**
 * Centralized file processing utilities for image handling
 * Extracted from API route to eliminate code duplication
 */

import { FILE_CONFIG } from '../config'
import fs from 'fs/promises'
import path from 'path'
import { FileMetadata } from '@/types'

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ProcessedFile {
  metadata: FileMetadata
  filePath: string
  buffer: Buffer
}

/**
 * Detects proper MIME type from file extension and provided MIME type
 * Extracted from API route lines 58-78
 */
export function getProperMimeType(fileName: string, providedMimeType: string): string {
  // If provided MIME type is valid image type, use it
  if (FILE_CONFIG.ALLOWED_MIME_TYPES.includes(providedMimeType.toLowerCase())) {
    return providedMimeType
  }
  
  // Fall back to file extension detection
  const ext = path.extname(fileName).toLowerCase() as keyof typeof FILE_CONFIG.MIME_TYPE_MAP
  return FILE_CONFIG.MIME_TYPE_MAP[ext] || FILE_CONFIG.DEFAULT_MIME_TYPE
}

/**
 * Validates image files for processing
 */
export function validateImageFiles(files: File[]): FileValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!files || files.length === 0) {
    errors.push('At least one image is required')
    return { valid: false, errors, warnings }
  }

  if (files.length > FILE_CONFIG.MAX_IMAGES) {
    errors.push(`Maximum ${FILE_CONFIG.MAX_IMAGES} images allowed per request`)
    return { valid: false, errors, warnings }
  }

  files.forEach((file, index) => {
    // Check file size (optional warning for very large files)
    const maxSizeWarning = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeWarning) {
      warnings.push(`Image ${index + 1} (${file.name}) is very large: ${Math.round(file.size / 1024 / 1024)}MB`)
    }

    // Check MIME type
    const detectedMimeType = getProperMimeType(file.name, file.type)
    if (!FILE_CONFIG.ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
      errors.push(`Image ${index + 1} (${file.name}) has unsupported type: ${file.type}`)
    }

    // Check file extension exists
    const extension = path.extname(file.name)
    if (!extension) {
      warnings.push(`Image ${index + 1} (${file.name}) has no file extension`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Saves uploaded files to temporary directory and creates metadata
 */
export async function saveTemporaryFiles(
  files: File[], 
  generateId: () => string = () => Math.random().toString(36).substring(2)
): Promise<ProcessedFile[]> {
  // Ensure tmp directory exists
  await fs.mkdir(FILE_CONFIG.TEMP_DIRECTORY, { recursive: true })

  const processedFiles: ProcessedFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileId = generateId()
    const fileExtension = path.extname(file.name) || '.jpg'
    const fileName = `${fileId}${fileExtension}`
    const filePath = path.join(FILE_CONFIG.TEMP_DIRECTORY, fileName)
    
    // Fix MIME type issue - detect proper MIME type
    const properMimeType = getProperMimeType(file.name, file.type)
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)
    
    const metadata: FileMetadata = {
      id: fileId,
      filename: file.name,
      mimeType: properMimeType,
      size: buffer.byteLength,
      uploadedAt: new Date()
    }

    processedFiles.push({
      metadata,
      filePath,
      buffer
    })
  }

  return processedFiles
}

/**
 * Cleans up temporary files
 */
export async function cleanupTemporaryFiles(filePaths: string[]): Promise<{ cleaned: number; errors: string[] }> {
  let cleaned = 0
  const errors: string[] = []

  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath)
      cleaned++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to clean up ${path.basename(filePath)}: ${errorMsg}`)
    }
  }

  return { cleaned, errors }
}

/**
 * Cleans up temporary files by metadata
 */
export async function cleanupTemporaryFilesByMetadata(
  fileMetadataList: FileMetadata[]
): Promise<{ cleaned: number; errors: string[] }> {
  const filePaths = fileMetadataList.map(metadata => 
    path.join(FILE_CONFIG.TEMP_DIRECTORY, `${metadata.id}${path.extname(metadata.filename)}`)
  )
  
  return cleanupTemporaryFiles(filePaths)
}

/**
 * Converts file metadata to Gemini API format
 */
export async function convertFilesToGeminiParts(fileMetadataList: FileMetadata[]): Promise<any[]> {
  const imageParts = []
  
  for (const fileMetadata of fileMetadataList) {
    const filePath = path.join(FILE_CONFIG.TEMP_DIRECTORY, `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
    
    try {
      const buffer = await fs.readFile(filePath)
      const base64Data = buffer.toString('base64')
      
      imageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: fileMetadata.mimeType
        }
      })
    } catch (error) {
      throw new Error(`Failed to read file: ${fileMetadata.filename}`)
    }
  }
  
  return imageParts
}

/**
 * Gets file stats for logging and monitoring
 */
export interface FileStats {
  totalFiles: number
  totalSize: number
  averageSize: number
  mimeTypes: Record<string, number>
  extensions: Record<string, number>
}

export function getFileStats(files: File[]): FileStats {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const averageSize = files.length > 0 ? Math.round(totalSize / files.length) : 0
  
  const mimeTypes: Record<string, number> = {}
  const extensions: Record<string, number> = {}
  
  files.forEach(file => {
    const mimeType = getProperMimeType(file.name, file.type)
    const extension = path.extname(file.name).toLowerCase()
    
    mimeTypes[mimeType] = (mimeTypes[mimeType] || 0) + 1
    extensions[extension || 'no-extension'] = (extensions[extension || 'no-extension'] || 0) + 1
  })
  
  return {
    totalFiles: files.length,
    totalSize,
    averageSize,
    mimeTypes,
    extensions
  }
}

/**
 * Formats file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Logs file processing statistics
 */
export function logFileProcessingStats(files: File[], processedFiles: ProcessedFile[]): void {
  const stats = getFileStats(files)
  
  console.log(`Processing ${stats.totalFiles} images:`)
  console.log(`  - Total size: ${formatFileSize(stats.totalSize)}`)
  console.log(`  - Average size: ${formatFileSize(stats.averageSize)}`)
  console.log(`  - MIME types: ${Object.entries(stats.mimeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`)
  
  processedFiles.forEach((file, index) => {
    console.log(`  Image ${index + 1}: ${file.metadata.filename} (${formatFileSize(file.metadata.size)})`)
  })
}

/**
 * File processing utilities class for organized access
 */
export const FileProcessor = {
  validate: validateImageFiles,
  save: saveTemporaryFiles,
  cleanup: cleanupTemporaryFiles,
  cleanupByMetadata: cleanupTemporaryFilesByMetadata,
  convertToGeminiParts: convertFilesToGeminiParts,
  getStats: getFileStats,
  logStats: logFileProcessingStats,
  formatSize: formatFileSize,
  getMimeType: getProperMimeType
}