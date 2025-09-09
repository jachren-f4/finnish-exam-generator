import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    console.log(`Looking for job with ID: ${jobId}`)

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = getJob(jobId)
    console.log(`Job found:`, job ? `Status: ${job.status}` : 'null')

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      fileCount: job.files.length,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    })

  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}