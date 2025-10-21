import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get environment info
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    // Mask the key for security (show first 20 and last 20 chars)
    const maskedKey = serviceKey
      ? `${serviceKey.substring(0, 20)}...${serviceKey.substring(serviceKey.length - 20)}`
      : 'NOT SET'

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl || 'NOT SET',
        serviceKeyPresent: !!serviceKey,
        serviceKeyLength: serviceKey?.length || 0,
        serviceKeyPreview: maskedKey,
        supabaseAdminInitialized: !!supabaseAdmin,
      },
      tests: {}
    }

    // Test 1: Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      diagnostics.tests.adminClient = {
        status: 'FAILED',
        error: 'supabaseAdmin is null - SUPABASE_SERVICE_ROLE_KEY not set or invalid'
      }

      return NextResponse.json(diagnostics, { status: 200 })
    }

    diagnostics.tests.adminClient = {
      status: 'OK',
      message: 'supabaseAdmin client initialized'
    }

    // Test 2: Try a simple query to examgenie_exams
    try {
      const { data, error, count } = await supabaseAdmin
        .from('examgenie_exams')
        .select('id', { count: 'exact', head: false })
        .limit(1)

      if (error) {
        diagnostics.tests.queryExamgenieExams = {
          status: 'FAILED',
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details
        }
      } else {
        diagnostics.tests.queryExamgenieExams = {
          status: 'OK',
          recordsFound: count || 0,
          sampleId: data?.[0]?.id || 'none'
        }
      }
    } catch (queryError: any) {
      diagnostics.tests.queryExamgenieExams = {
        status: 'EXCEPTION',
        error: queryError.message
      }
    }

    // Test 3: Try to query a specific exam
    try {
      const testExamId = '40aca3a0-eb9a-4ce3-a4d9-eccc0eb609df'
      const { data, error } = await supabaseAdmin
        .from('examgenie_exams')
        .select('id, status, created_at')
        .eq('id', testExamId)
        .maybeSingle()

      if (error) {
        diagnostics.tests.querySpecificExam = {
          status: 'FAILED',
          examId: testExamId,
          error: error.message,
          errorCode: error.code
        }
      } else if (!data) {
        diagnostics.tests.querySpecificExam = {
          status: 'NOT_FOUND',
          examId: testExamId,
          message: 'Exam exists but query returned null (possible RLS issue)'
        }
      } else {
        diagnostics.tests.querySpecificExam = {
          status: 'OK',
          examId: testExamId,
          examStatus: data.status,
          examCreatedAt: data.created_at
        }
      }
    } catch (queryError: any) {
      diagnostics.tests.querySpecificExam = {
        status: 'EXCEPTION',
        error: queryError.message
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
