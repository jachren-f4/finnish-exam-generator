import { NextRequest, NextResponse } from 'next/server'
import { submitAnswers } from '@/lib/exam-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(examId)) {
      return NextResponse.json(
        { error: 'Virheellinen kokeen tunniste', details: 'Kokeen tunniste ei ole oikeassa muodossa' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Virheelliset vastaukset', details: 'Vastaukset täytyy antaa taulukkomuodossa' },
        { status: 400 }
      )
    }

    // Validate answers format
    for (const answer of answers) {
      if (!answer.question_id || typeof answer.answer_text !== 'string') {
        return NextResponse.json(
          { error: 'Virheellinen vastaus', details: 'Jokainen vastaus tarvitsee question_id ja answer_text kentät' },
          { status: 400 }
        )
      }
    }

    const gradingResult = await submitAnswers(examId, answers)
    
    if (!gradingResult) {
      return NextResponse.json(
        { error: 'Vastausten lähettäminen epäonnistui', details: 'Koe ei ole saatavilla tai sitä on jo arvosteltu' },
        { status: 409 }
      )
    }

    const baseUrl = 'https://exam-generator.vercel.app'

    return NextResponse.json({
      success: true,
      message: 'Vastaukset lähetetty ja arvosteltu onnistuneesti',
      exam_id: examId,
      status: 'graded',
      final_grade: gradingResult.final_grade,
      total_points: gradingResult.total_points,
      max_total_points: gradingResult.max_total_points,
      grading_url: `${baseUrl}/grading/${examId}`
    })

  } catch (error) {
    console.error('Error submitting answers:', error)
    return NextResponse.json(
      { error: 'Palvelinvirhe', details: 'Vastausten lähettäminen epäonnistui' },
      { status: 500 }
    )
  }
}

// Handle CORS for exam submission
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}