import { NextRequest } from 'next/server'
import { getJob } from '@/lib/jobs'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorContext = {
    endpoint: '/api/ocr/jobs/[id]',
    method: 'GET'
  }

  try {
    const { id: jobId } = await params
    console.log(`Looking for job with ID: ${jobId}`)

    if (!jobId) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Job ID is required',
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'Job ID is required'
      )
    }

    const job = getJob(jobId)
    console.log(`Job found:`, job ? `Status: ${job.status}` : 'null')

    if (!job) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'OCR job not found',
        { ...errorContext, additionalData: { jobId } }
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.notFound(
        'Job not found'
      )
    }

    return ApiResponseBuilder.success({
      id: job.id,
      status: job.status,
      fileCount: job.files.length,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    })

  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      ErrorManager.getUserMessage(managedError),
      managedError.details
    )
  }
}