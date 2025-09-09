import { NextRequest, NextResponse } from 'next/server'
import { createJob, updateJobStatus } from '@/lib/jobs'
import { processImagesWithGemini } from '@/lib/gemini'
import { FileMetadata, OCRResult } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, customPrompt }: { files: FileMetadata[], customPrompt?: string } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 files allowed per job' },
        { status: 400 }
      )
    }

    // Create job
    const job = createJob(files, customPrompt)

    // Start processing asynchronously
    processJobAsync(job.id, files, customPrompt)

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Job created successfully. Processing started.'
    })

  } catch (error) {
    console.error('Error creating OCR job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processJobAsync(jobId: string, files: FileMetadata[], customPrompt?: string) {
  console.log(`Starting async job processing for job ${jobId} with ${files.length} files`)
  if (customPrompt) {
    console.log(`Using custom prompt: ${customPrompt.substring(0, 100)}...`)
  }
  try {
    // Update job status to processing
    updateJobStatus(jobId, 'processing')
    console.log(`Job ${jobId} status updated to processing`)

    // Process images with Gemini
    const startTime = Date.now()
    console.log(`Calling Gemini API for job ${jobId}`)
    const geminiResults = await processImagesWithGemini(files, customPrompt)
    const endTime = Date.now()
    console.log(`Gemini processing completed for job ${jobId} in ${endTime - startTime}ms`)

    // Create OCR results
    const results: OCRResult[] = files.map((file, index) => ({
      fileId: file.id,
      rawText: geminiResults[index]?.rawText || '',
      compressed: geminiResults[index]?.compressed || {
        vocabulary: { tokens: [], phrases: [] },
        body: { segments: [] },
        stats: {
          originalLength: 0,
          compressedLength: 0,
          compressionRatio: 1,
          tokenCount: 0,
          phraseCount: 0
        }
      },
      processingTime: endTime - startTime,
      geminiUsage: geminiResults[index]?.geminiUsage
    }))

    // Update job with results
    updateJobStatus(jobId, 'completed', results)

    console.log(`Job ${jobId} completed successfully`)

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error)
    updateJobStatus(jobId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error')
  }
}