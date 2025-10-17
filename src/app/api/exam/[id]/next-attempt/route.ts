import { NextRequest, NextResponse } from 'next/server'
import { getNextAttemptNumber } from '@/lib/exam-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const examId = resolvedParams.id

    const attemptNumber = await getNextAttemptNumber(examId)

    return NextResponse.json({
      success: true,
      attemptNumber
    })

  } catch (error) {
    console.error('Error getting next attempt number:', error)
    return NextResponse.json(
      { error: 'Failed to get next attempt number' },
      { status: 500 }
    )
  }
}
