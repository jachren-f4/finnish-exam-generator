import { NextRequest, NextResponse } from 'next/server'
import { getGradingResults } from '@/lib/exam-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      )
    }

    const gradingResult = await getGradingResults(examId)

    if (!gradingResult) {
      return NextResponse.json(
        { error: 'No grading results found for this exam' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gradingResult
    })

  } catch (error) {
    console.error('Error fetching grading results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grading results' },
      { status: 500 }
    )
  }
}
