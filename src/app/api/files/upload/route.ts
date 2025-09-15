import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { FileMetadata } from '@/types'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'

const UPLOAD_DIR = '/tmp'
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 20

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  const errorContext = {
    endpoint: '/api/files/upload',
    method: 'POST'
  }

  try {
    await ensureUploadDir()

    const formData = await request.formData()
    const files = formData.getAll('file') as File[]
    
    if (!files || files.length === 0) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'No files provided',
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'No files uploaded'
      )
    }

    if (files.length > MAX_FILES) {
      const managedError = ErrorManager.createFromPattern(
        'TOO_MANY_FILES',
        `Attempted to upload ${files.length} files`,
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        ErrorManager.getUserMessage(managedError)
      )
    }

    const uploadedFiles: FileMetadata[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Validate file type
        if (!SUPPORTED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Unsupported file type`)
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 10MB)`)
          continue
        }

        // Generate unique filename
        const fileId = uuidv4()
        const ext = path.extname(file.name)
        const filename = `${fileId}${ext}`
        const filepath = path.join(UPLOAD_DIR, filename)

        // Save file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await fs.writeFile(filepath, buffer)

        // Get image dimensions if possible
        let width: number | undefined
        let height: number | undefined
        
        // For now, we'll set dimensions to undefined
        // In a real implementation, you might use a library like 'sharp' to get image dimensions

        const fileMetadata: FileMetadata = {
          id: fileId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          width,
          height,
          uploadedAt: new Date(),
        }

        uploadedFiles.push(fileMetadata)
      } catch (error) {
        const managedError = ErrorManager.createFromError(
          error instanceof Error ? error : new Error(`Processing failed for ${file.name}`),
          { ...errorContext, additionalData: { fileName: file.name } },
          ErrorCategory.FILE_PROCESSING
        )
        ErrorManager.logError(managedError)
        errors.push(`${file.name}: Processing failed`)
      }
    }

    if (uploadedFiles.length === 0 && errors.length > 0) {
      const managedError = ErrorManager.createFromError(
        new Error('No files were successfully uploaded'),
        { ...errorContext, additionalData: { errors } },
        ErrorCategory.FILE_PROCESSING
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'No files were successfully uploaded',
        errors.join(', ')
      )
    }

    const response = {
      success: true,
      files: uploadedFiles,
      ...(errors.length > 0 && { warnings: errors })
    }

    return ApiResponseBuilder.success(response)
  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      ErrorManager.getUserMessage(managedError),
      managedError.details
    )
  }
}