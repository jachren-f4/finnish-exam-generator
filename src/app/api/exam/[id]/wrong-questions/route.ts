import { NextRequest, NextResponse } from 'next/server'
import { getWrongQuestionIds } from '@/lib/exam-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const examId = resolvedParams.id

    const wrongQuestionIds = await getWrongQuestionIds(examId)

    return NextResponse.json({
      success: true,
      wrongQuestionIds
    })

  } catch (error) {
    console.error('Error getting wrong question IDs:', error)
    return NextResponse.json(
      { error: 'Failed to get wrong question IDs' },
      { status: 500 }
    )
  }
}
