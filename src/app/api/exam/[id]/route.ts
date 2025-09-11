import { NextRequest, NextResponse } from 'next/server'
import { getExamForTaking, getExamState } from '@/lib/exam-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const examId = resolvedParams.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(examId)) {
      return NextResponse.json(
        { error: 'Virheellinen kokeen tunniste', details: 'Kokeen tunniste ei ole oikeassa muodossa' },
        { status: 400 }
      )
    }

    // First try to get exam state (includes completion status)
    const examState = await getExamState(examId)
    
    if (!examState) {
      return NextResponse.json(
        { error: 'Koetta ei löytynyt', details: 'Koe ei ole saatavilla tai sitä ei ole olemassa' },
        { status: 404 }
      )
    }

    // If exam hasn't been completed yet, only allow if status is 'created'
    if (!examState.canReuse && examState.exam?.status !== 'created') {
      return NextResponse.json(
        { error: 'Koe ei ole saatavilla', details: 'Koe ei ole vielä valmis tai sitä ei voida suorittaa uudelleen' },
        { status: 403 }
      )
    }

    // Return exam data along with state information
    return NextResponse.json({
      ...examState.exam,
      canReuse: examState.canReuse,
      hasBeenCompleted: examState.hasBeenCompleted,
      latestGrading: examState.latestGrading
    })

  } catch (error) {
    console.error('Error fetching exam:', error)
    return NextResponse.json(
      { error: 'Palvelinvirhe', details: 'Kokeen haku epäonnistui' },
      { status: 500 }
    )
  }
}

// Handle CORS for exam pages
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}