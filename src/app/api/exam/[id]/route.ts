import { NextRequest, NextResponse } from 'next/server'
import { getExamForTaking } from '@/lib/exam-service'

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

    const exam = await getExamForTaking(examId)
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Koetta ei löytynyt', details: 'Koe ei ole saatavilla tai sitä ei ole olemassa' },
        { status: 404 }
      )
    }

    return NextResponse.json(exam)

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