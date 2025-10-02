import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

// GET /api/exams/[id]/share-text - Get WhatsApp share text
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, { user, supabase }) => {
    try {
      const { id: examId } = await params

      // Get exam and verify ownership
      const { data: exam, error: examError } = await supabase
        .from('examgenie_exams')
        .select(`
          id,
          subject,
          grade,
          status,
          sharing_url,
          share_id,
          created_at
        `)
        .eq('id', examId)
        .eq('user_id', user.id)
        .single()

      if (examError || !exam) {
        return NextResponse.json(
          { error: 'Exam not found or access denied' },
          { status: 404 }
        )
      }

      if (exam.status !== 'READY') {
        return NextResponse.json(
          { error: 'Only ready exams can be shared' },
          { status: 400 }
        )
      }

      // Create sharing URL if it doesn't exist
      let sharingUrl = exam.sharing_url
      if (!sharingUrl) {
        sharingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/exam/${exam.share_id}`

        const { error: updateError } = await supabase
          .from('examgenie_exams')
          .update({ sharing_url: sharingUrl })
          .eq('id', examId)

        if (updateError) {
          console.error('Error creating sharing URL:', updateError)
          return NextResponse.json(
            { error: 'Failed to create sharing URL' },
            { status: 500 }
          )
        }
      }

      // Get question count
      const { data: questions, error: questionsError } = await supabase
        .from('examgenie_questions')
        .select('id')
        .eq('exam_id', examId)
        .eq('is_selected', true)

      const questionCount = questions?.length || 0

      // Generate Finnish WhatsApp message
      const whatsappText = `🎓 ExamGenie - Uusi koe valmis!

📚 Aine: ${exam.subject}
👨‍🎓 Luokka: ${exam.grade}. luokka
❓ Kysymyksiä: ${questionCount}
📅 Luotu: ${new Date(exam.created_at).toLocaleDateString('fi-FI')}

Avaa koe: ${sharingUrl}

Luotu ExamGenie-sovelluksella 📱`

      // URL encode for WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

      return NextResponse.json({
        exam_id: examId,
        sharing_url: sharingUrl,
        share_id: exam.share_id,
        whatsapp_text: whatsappText,
        whatsapp_url: whatsappUrl,
        question_count: questionCount
      })

    } catch (error) {
      console.error('Share text generation error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}