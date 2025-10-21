/**
 * Exam Repository Service
 * Extracted from exam-service.ts to provide focused database operations
 * Handles all exam-related database interactions
 */

import { supabase, supabaseAdmin, DbExam, ExamData } from '../supabase'
import { DatabaseInsertData } from './exam-creator'
import { createTimer, endTimer } from '../utils/performance-logger'

export interface ExamSearchOptions {
  status?: 'created' | 'answered' | 'graded'
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'subject' | 'grade'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Exam Repository Class
 * Provides data access layer for exam operations
 */
export class ExamRepository {
  /**
   * Creates a new exam record in the database
   */
  static async create(insertData: DatabaseInsertData): Promise<string | null> {
    const timer = createTimer('Database Insert')
    
    try {
      console.log('Inserting exam into database...')
      console.log('Insert data structure:', {
        hasSubject: !!insertData.subject,
        hasGrade: !!insertData.grade,
        hasExamJson: !!insertData.exam_json,
        promptType: insertData.prompt_type,
        promptLength: insertData.prompt_length,
        hasDiagnostic: !!insertData.diagnostic_enabled,
        hasUsage: !!insertData.creation_gemini_usage
      })

      const { data: exam, error } = await supabase
        .from('exams')
        .insert(insertData)
        .select('exam_id')
        .single()

      endTimer(timer)

      if (error) {
        console.error('SUPABASE INSERT ERROR:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        return null
      }

      console.log('Supabase insert successful! Exam ID:', exam?.exam_id)
      return exam.exam_id

    } catch (error) {
      endTimer(timer)
      console.error('Database insert exception:', error)
      return null
    }
  }

  /**
   * Finds an exam by ID with full data (including answers)
   * Checks both legacy 'exams' table and new 'examgenie_exams' table
   */
  static async findById(examId: string): Promise<DbExam | null> {
    const timer = createTimer('Find Exam by ID', { examId })

    try {
      console.log('🔍 Looking for exam in legacy table:', examId)
      // First try the legacy 'exams' table
      const { data: legacyExam, error: legacyError } = await supabase
        .from('exams')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle()

      console.log('🔍 Legacy table lookup result:', { legacyExam: !!legacyExam, legacyError })

      if (legacyExam && !legacyError) {
        endTimer(timer)
        return legacyExam as DbExam
      }

      console.log('🔍 Looking for exam in examgenie_exams table:', examId)
      // If not found in legacy table, try the ExamGenie table with admin client
      if (!supabaseAdmin) {
        console.error('supabaseAdmin not available')
        endTimer(timer)
        return null
      }

      const { data: examgenieExam, error: examgenieError } = await supabaseAdmin
        .from('examgenie_exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle()

      console.log('🔍 ExamGenie table lookup result:', { examgenieExam: !!examgenieExam, examgenieError })

      endTimer(timer)

      if (examgenieError || !examgenieExam) {
        console.warn(`Exam not found in both tables: ${examId}`, examgenieError?.message || 'No data returned')
        return null
      }

      // Transform ExamGenie exam to legacy format for compatibility
      const transformedExam: DbExam = {
        exam_id: examgenieExam.id,
        subject: examgenieExam.subject,
        grade: examgenieExam.grade, // Keep as string to match DbExam interface
        status: examgenieExam.status === 'READY' ? 'created' : examgenieExam.status.toLowerCase(),
        created_at: examgenieExam.created_at,
        exam_json: {
          exam: {
            questions: [] // Will be populated from examgenie_questions table if needed
          },
          topic: examgenieExam.subject,
          difficulty: 'elementary'
        }
      }

      return transformedExam

    } catch (error) {
      endTimer(timer)
      console.error('Error finding exam by ID:', error)
      return null
    }
  }

  /**
   * Finds an exam for taking (without answers)
   * Checks both legacy 'exams' table and new 'examgenie_exams' table
   */
  static async findForTaking(examId: string): Promise<ExamData | null> {
    const timer = createTimer('Find Exam for Taking', { examId })

    try {
      // First try the legacy 'exams' table
      const { data: legacyExam, error: legacyError } = await supabase
        .from('exams')
        .select('*')
        .eq('exam_id', examId)
        .eq('status', 'created')
        .maybeSingle()

      if (legacyExam && !legacyError) {
        endTimer(timer)

        // Transform database exam to display format (remove answers)
        const examJson = legacyExam.exam_json
        const questions = examJson.exam.questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          max_points: q.max_points
          // Note: answer_text and explanation excluded for exam taking
        }))

        const totalPoints = questions.reduce((sum: number, q: any) => sum + q.max_points, 0)

        return {
          exam_id: legacyExam.exam_id,
          subject: legacyExam.subject,
          grade: legacyExam.grade,
          status: legacyExam.status,
          created_at: legacyExam.created_at,
          questions,
          total_questions: questions.length,
          max_total_points: totalPoints
        }
      }

      // If not found in legacy table, try the ExamGenie table
      console.log('🔍 Looking for examgenie exam:', examId)
      if (!supabaseAdmin) {
        console.error('supabaseAdmin not available')
        endTimer(timer)
        return null
      }

      const { data: examgenieExam, error: examgenieError } = await supabaseAdmin
        .from('examgenie_exams')
        .select('*')
        .eq('id', examId)
        .eq('status', 'READY')
        .maybeSingle()

      console.log('🔍 ExamGenie lookup result:', { examgenieExam, examgenieError })

      if (examgenieError || !examgenieExam) {
        endTimer(timer)
        return null
      }

      // Get questions from examgenie_questions table
      const { data: examgenieQuestions, error: questionsError } = await supabaseAdmin
        .from('examgenie_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number', { ascending: true })

      if (questionsError || !examgenieQuestions) {
        endTimer(timer)
        return null
      }

      // Transform ExamGenie questions to legacy format (without answers)
      const questions = examgenieQuestions.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        max_points: q.max_points || 2
        // Note: correct_answer and explanation excluded for exam taking
      }))

      const totalPoints = questions.reduce((sum: number, q: any) => sum + q.max_points, 0)

      endTimer(timer)

      return {
        exam_id: examgenieExam.id,
        subject: examgenieExam.subject,
        grade: examgenieExam.grade, // Keep as string for consistency
        status: 'created', // Map READY to created for compatibility
        created_at: examgenieExam.created_at,
        questions,
        total_questions: questions.length,
        max_total_points: totalPoints,
        audio_url: examgenieExam.audio_url || null,
        summary_text: examgenieExam.summary_text || null,
        key_concepts: examgenieExam.key_concepts || null,  // NEW: Include key concepts
        gamification: examgenieExam.gamification || null  // NEW: Include gamification
      }

    } catch (error) {
      endTimer(timer)
      return null
    }
  }

  /**
   * Updates exam status
   */
  static async updateStatus(examId: string, status: 'created' | 'answered' | 'graded'): Promise<boolean> {
    const timer = createTimer('Update Exam Status', { examId, status })
    
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status })
        .eq('exam_id', examId)

      endTimer(timer)

      if (error) {
        console.error('Error updating exam status:', error)
        return false
      }

      console.log(`Exam ${examId} status updated to: ${status}`)
      return true

    } catch (error) {
      endTimer(timer)
      console.error('Exception updating exam status:', error)
      return false
    }
  }

  /**
   * Get grading result for an exam
   */
  static async getGradingResult(examId: string): Promise<any | null> {
    const timer = createTimer('Get Grading Result', { examId })

    try {
      // First try to get from examgenie_results table
      const { data: result, error } = await supabase
        .from('examgenie_results')
        .select('*')
        .eq('exam_id', examId)
        .single()

      endTimer(timer)

      if (error) {
        console.error('Error getting grading result:', error)
        return null
      }

      return result

    } catch (error) {
      endTimer(timer)
      console.error('Exception getting grading result:', error)
      return null
    }
  }

  /**
   * Searches for exams with various filters
   */
  static async search(options: ExamSearchOptions = {}): Promise<DbExam[]> {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = options

    const timer = createTimer('Search Exams', options)
    
    try {
      let query = supabase
        .from('exams')
        .select('*')
        .range(offset, offset + limit - 1)
        .order(orderBy, { ascending: orderDirection === 'asc' })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: exams, error } = await query

      endTimer(timer)

      if (error) {
        console.error('Error searching exams:', error)
        return []
      }

      return (exams || []) as DbExam[]

    } catch (error) {
      endTimer(timer)
      console.error('Exception searching exams:', error)
      return []
    }
  }

  /**
   * Gets exam statistics
   */
  static async getStats(): Promise<{
    total: number
    byStatus: Record<string, number>
    byGrade: Record<string, number>
    recentCount: number
  }> {
    const timer = createTimer('Get Exam Stats')
    
    try {
      // Get total count and status breakdown
      const { data: statusStats, error: statusError } = await supabase
        .from('exams')
        .select('status, grade')

      if (statusError) {
        throw statusError
      }

      // Get recent exams count (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const { count: recentCount, error: recentError } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())

      if (recentError) {
        throw recentError
      }

      endTimer(timer)

      // Process statistics
      const byStatus: Record<string, number> = {}
      const byGrade: Record<string, number> = {}

      statusStats?.forEach(exam => {
        byStatus[exam.status] = (byStatus[exam.status] || 0) + 1
        byGrade[exam.grade] = (byGrade[exam.grade] || 0) + 1
      })

      return {
        total: statusStats?.length || 0,
        byStatus,
        byGrade,
        recentCount: recentCount || 0
      }

    } catch (error) {
      endTimer(timer)
      console.error('Error getting exam stats:', error)
      return {
        total: 0,
        byStatus: {},
        byGrade: {},
        recentCount: 0
      }
    }
  }

  /**
   * Deletes an exam and related data
   */
  static async delete(examId: string): Promise<boolean> {
    const timer = createTimer('Delete Exam', { examId })
    
    try {
      // Note: Due to foreign key constraints, we should delete in order:
      // 1. Grading records
      // 2. Answer records  
      // 3. Exam record
      
      // Delete grading records
      await supabase
        .from('grading')
        .delete()
        .eq('exam_id', examId)

      // Delete answer records
      await supabase
        .from('answers')
        .delete()
        .eq('exam_id', examId)

      // Delete exam record
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('exam_id', examId)

      endTimer(timer)

      if (error) {
        console.error('Error deleting exam:', error)
        return false
      }

      console.log(`Exam ${examId} deleted successfully`)
      return true

    } catch (error) {
      endTimer(timer)
      console.error('Exception deleting exam:', error)
      return false
    }
  }

  /**
   * Checks if exam exists
   */
  static async exists(examId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId)

      if (error) {
        return false
      }

      return (count || 0) > 0

    } catch (error) {
      return false
    }
  }

  /**
   * Gets exam creation statistics for cost analysis
   */
  static async getCostAnalytics(days: number = 30): Promise<{
    totalCost: number
    averageCost: number
    totalTokens: number
    examCount: number
    costByDay: Array<{ date: string; cost: number; exams: number }>
  }> {
    const timer = createTimer('Get Cost Analytics', { days })
    
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: exams, error } = await supabase
        .from('exams')
        .select('created_at, creation_gemini_usage')
        .gte('created_at', startDate.toISOString())
        .not('creation_gemini_usage', 'is', null)

      endTimer(timer)

      if (error || !exams) {
        return {
          totalCost: 0,
          averageCost: 0,
          totalTokens: 0,
          examCount: 0,
          costByDay: []
        }
      }

      let totalCost = 0
      let totalTokens = 0
      const costByDay: Record<string, { cost: number; exams: number }> = {}

      exams.forEach(exam => {
        const usage = exam.creation_gemini_usage
        if (usage && usage.estimatedCost) {
          totalCost += usage.estimatedCost
          totalTokens += usage.totalTokenCount || 0

          const dateKey = new Date(exam.created_at).toISOString().split('T')[0]
          if (!costByDay[dateKey]) {
            costByDay[dateKey] = { cost: 0, exams: 0 }
          }
          costByDay[dateKey].cost += usage.estimatedCost
          costByDay[dateKey].exams += 1
        }
      })

      const costByDayArray = Object.entries(costByDay).map(([date, data]) => ({
        date,
        cost: data.cost,
        exams: data.exams
      }))

      return {
        totalCost,
        averageCost: exams.length > 0 ? totalCost / exams.length : 0,
        totalTokens,
        examCount: exams.length,
        costByDay: costByDayArray
      }

    } catch (error) {
      endTimer(timer)
      console.error('Error getting cost analytics:', error)
      return {
        totalCost: 0,
        averageCost: 0,
        totalTokens: 0,
        examCount: 0,
        costByDay: []
      }
    }
  }
}