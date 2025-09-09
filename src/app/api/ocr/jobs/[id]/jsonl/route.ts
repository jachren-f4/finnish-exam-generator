import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'
import { JSONLExport } from '@/types'

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

    // Generate JSONL content
    const jsonlLines: string[] = []
    
    for (const result of job.results) {
      const file = job.files.find(f => f.id === result.fileId)
      if (!file) continue

      const exportRecord: JSONLExport = {
        userId: 'local-user', // Since this is a localhost app
        stage: 'production',
        fileId: result.fileId,
        filename: file.filename,
        rawText: result.rawText,
        compressed: result.compressed,
        timestamp: job.completedAt?.toISOString() || new Date().toISOString()
      }

      jsonlLines.push(JSON.stringify(exportRecord))
    }

    const jsonlContent = jsonlLines.join('\n')

    // Return as downloadable JSONL file
    const headers = new Headers({
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="ocr-results-${jobId}.jsonl"`,
      'Content-Length': Buffer.byteLength(jsonlContent, 'utf8').toString()
    })

    return new NextResponse(jsonlContent, { headers })

  } catch (error) {
    console.error('Error generating JSONL export:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}