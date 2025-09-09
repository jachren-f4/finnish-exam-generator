import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = getJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Job not completed yet',
          status: job.status,
          ...(job.error && { details: job.error })
        },
        { status: 400 }
      )
    }

    if (!job.results) {
      return NextResponse.json(
        { error: 'No results available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      completedAt: job.completedAt,
      customPrompt: job.customPrompt,
      results: job.results.map(result => ({
        fileId: result.fileId,
        filename: job.files.find(f => f.id === result.fileId)?.filename,
        rawText: result.rawText,
        compressed: result.compressed,
        processingTime: result.processingTime,
        geminiUsage: result.geminiUsage
      }))
    })

  } catch (error) {
    console.error('Error fetching job results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}