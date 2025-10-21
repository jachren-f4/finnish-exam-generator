import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/auth/admin-auth'

/**
 * Admin Analytics API
 *
 * GET /api/admin/analytics
 * Returns comprehensive analytics data for the admin dashboard
 *
 * Protected by Basic HTTP Auth
 */
async function handleAnalytics(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Run all analytics queries in parallel
    const [
      dauData,
      newUsersData,
      retentionData,
      sessionLengthData,
      examsData,
      usersData,
      platformsData,
      subjectsData,
      categoriesData,
      costData,
    ] = await Promise.all([
      getDAU(supabase),
      getNewUsers(supabase),
      getRetention(supabase),
      getSessionLength(supabase),
      getExams(supabase),
      getUsers(supabase),
      getPlatforms(supabase),
      getTopSubjects(supabase),
      getTopCategories(supabase),
      getCostMetrics(supabase),
    ])

    return NextResponse.json({
      dau: dauData,
      new_users: newUsersData,
      retention: retentionData,
      session_length: sessionLengthData,
      exams: examsData,
      users: usersData,
      platforms: platformsData,
      top_subjects: subjectsData,
      top_categories: categoriesData,
      costs: costData,
    })
  } catch (error) {
    console.error('[Analytics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleAnalytics)

// Helper functions for each metric

async function getDAU(supabase: any) {
  // DAU today
  const { data: todayData, error: todayError } = await supabase.rpc('get_dau_today')

  let today = todayData
  if (todayError) {
    // Fallback to direct query
    const { count: todayCount } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('session_start', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lt('session_start', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())

    today = todayCount || 0
  }

  // DAU yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const { count: yesterdayCount } = await supabase
    .from('user_sessions')
    .select('user_id', { count: 'exact', head: true })
    .gte('session_start', new Date(yesterday.setHours(0, 0, 0, 0)).toISOString())
    .lt('session_start', new Date(yesterday.setHours(23, 59, 59, 999)).toISOString())

  const changePercent =
    yesterdayCount && yesterdayCount > 0
      ? ((today - yesterdayCount) / yesterdayCount) * 100
      : 0

  // DAU last 30 days
  const { data: last30Days } = await supabase
    .from('user_sessions')
    .select('session_start')
    .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const dauByDate = new Map<string, Set<string>>()
  last30Days?.forEach((session: any) => {
    const date = session.session_start.split('T')[0]
    if (!dauByDate.has(date)) {
      dauByDate.set(date, new Set())
    }
    dauByDate.get(date)!.add(session.user_id)
  })

  const last30DaysData = Array.from(dauByDate.entries())
    .map(([date, users]) => ({ date, users: users.size }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    today,
    yesterday: yesterdayCount || 0,
    change_percent: parseFloat(changePercent.toFixed(2)),
    last_30_days: last30DaysData,
  }
}

async function getNewUsers(supabase: any) {
  // New users today
  const { count: today } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('is_new_user', true)
    .gte('session_start', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  // New users yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const { count: yesterdayCount } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('is_new_user', true)
    .gte('session_start', new Date(yesterday.setHours(0, 0, 0, 0)).toISOString())
    .lt('session_start', new Date(yesterday.setHours(23, 59, 59, 999)).toISOString())

  const changePercent =
    yesterdayCount && yesterdayCount > 0
      ? ((today - yesterdayCount) / yesterdayCount) * 100
      : 0

  // New users last 30 days
  const { data: last30Days } = await supabase
    .from('user_sessions')
    .select('session_start')
    .eq('is_new_user', true)
    .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const newUsersByDate = new Map<string, number>()
  last30Days?.forEach((session: any) => {
    const date = session.session_start.split('T')[0]
    newUsersByDate.set(date, (newUsersByDate.get(date) || 0) + 1)
  })

  const last30DaysData = Array.from(newUsersByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    today: today || 0,
    yesterday: yesterdayCount || 0,
    change_percent: parseFloat(changePercent.toFixed(2)),
    last_30_days: last30DaysData,
  }
}

async function getRetention(supabase: any) {
  // This would ideally be a SQL function for performance
  // For now, return placeholder data
  // TODO: Implement complex retention queries

  return {
    overall: {
      day_1: 0,
      day_3: 0,
      day_7: 0,
      day_14: 0,
      day_30: 0,
    },
    cohorts: [],
  }
}

async function getSessionLength(supabase: any) {
  // Average and median session length
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('session_start, last_heartbeat')
    .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!sessions || sessions.length === 0) {
    return {
      average_minutes: 0,
      median_minutes: 0,
      distribution: [],
      trend_last_30_days: [],
    }
  }

  // Calculate session lengths in minutes (rounded up)
  const lengths = sessions.map((s: any) => {
    const start = new Date(s.session_start).getTime()
    const end = new Date(s.last_heartbeat).getTime()
    return Math.ceil((end - start) / (60 * 1000))
  })

  const avgMinutes = lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length
  const sortedLengths = [...lengths].sort((a: number, b: number) => a - b)
  const medianMinutes = sortedLengths[Math.floor(sortedLengths.length / 2)]

  // Distribution
  const buckets = {
    '0-1 min': 0,
    '1-3 min': 0,
    '3-5 min': 0,
    '5-10 min': 0,
    '10+ min': 0,
  }

  lengths.forEach((len: number) => {
    if (len <= 1) buckets['0-1 min']++
    else if (len <= 3) buckets['1-3 min']++
    else if (len <= 5) buckets['3-5 min']++
    else if (len <= 10) buckets['5-10 min']++
    else buckets['10+ min']++
  })

  const distribution = Object.entries(buckets).map(([bucket, count]) => ({
    bucket,
    count,
    percentage: parseFloat(((count / lengths.length) * 100).toFixed(2)),
  }))

  return {
    average_minutes: parseFloat(avgMinutes.toFixed(2)),
    median_minutes: medianMinutes,
    distribution,
    trend_last_30_days: [], // TODO: Implement trend
  }
}

async function getExams(supabase: any) {
  // Exams today
  const { count: today } = await supabase
    .from('examgenie_exams')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  // Total exams
  const { count: total } = await supabase
    .from('examgenie_exams')
    .select('*', { count: 'exact', head: true })

  // Last 30 days
  const { data: last30Days } = await supabase
    .from('examgenie_exams')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const examsByDate = new Map<string, number>()
  last30Days?.forEach((exam: any) => {
    const date = exam.created_at.split('T')[0]
    examsByDate.set(date, (examsByDate.get(date) || 0) + 1)
  })

  const last30DaysData = Array.from(examsByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    today: today || 0,
    total: total || 0,
    last_30_days: last30DaysData,
  }
}

async function getUsers(supabase: any) {
  // Total users from auth.users
  const { count: total } = await supabase.auth.admin.listUsers()

  // Active users 7 days
  const { count: active7d } = await supabase
    .from('user_sessions')
    .select('user_id', { count: 'exact', head: true })
    .gte('session_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Active users 30 days
  const { count: active30d } = await supabase
    .from('user_sessions')
    .select('user_id', { count: 'exact', head: true })
    .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  return {
    total: total?.users?.length || 0,
    active_7d: active7d || 0,
    active_30d: active30d || 0,
  }
}

async function getPlatforms(supabase: any) {
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('platform')
    .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const platformCounts = new Map<string, number>()
  sessions?.forEach((s: any) => {
    const platform = s.platform || 'unknown'
    platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1)
  })

  const total = sessions?.length || 0
  const platforms: Record<string, { sessions: number; percentage: number }> = {}

  platformCounts.forEach((count, platform) => {
    platforms[platform] = {
      sessions: count,
      percentage: parseFloat(((count / total) * 100).toFixed(2)),
    }
  })

  return platforms
}

async function getTopSubjects(supabase: any) {
  const { data: exams } = await supabase
    .from('examgenie_exams')
    .select('subject')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not('subject', 'is', null)

  const subjectCounts = new Map<string, number>()
  exams?.forEach((e: any) => {
    subjectCounts.set(e.subject, (subjectCounts.get(e.subject) || 0) + 1)
  })

  return Array.from(subjectCounts.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function getTopCategories(supabase: any) {
  const { data: exams } = await supabase
    .from('examgenie_exams')
    .select('category')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not('category', 'is', null)

  const categoryCounts = new Map<string, number>()
  exams?.forEach((e: any) => {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) || 0) + 1)
  })

  return Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function getCostMetrics(supabase: any) {
  const now = new Date()
  const startOfToday = new Date(now.setHours(0, 0, 0, 0))
  const last30DaysStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 1. Exam creation costs
  const { data: examCosts } = await supabase
    .from('examgenie_exams')
    .select('created_at, creation_gemini_usage, audio_generation_cost, category, subject')
    .gte('created_at', last30DaysStart.toISOString())
    .not('creation_gemini_usage', 'is', null)

  // 2. Grading costs
  const { data: gradingCosts } = await supabase
    .from('examgenie_grading')
    .select('graded_at, grading_gemini_usage, exam_id')
    .gte('graded_at', last30DaysStart.toISOString())
    .not('grading_gemini_usage', 'is', null)

  // 3. Calculate totals
  let totalExamCost = 0
  let totalGradingCost = 0
  let totalAudioCost = 0
  let todayExamCost = 0
  let todayGradingCost = 0
  let todayAudioCost = 0

  const costByDate = new Map<string, { exam: number; grading: number; audio: number; total: number }>()
  const costByCategory = new Map<string, number>()

  // Process exam costs
  examCosts?.forEach((exam: any) => {
    const examCost = exam.creation_gemini_usage?.estimatedCost || 0
    const audioCost = exam.audio_generation_cost?.estimatedCost || 0
    const date = exam.created_at.split('T')[0]
    const category = exam.category || 'unknown'

    totalExamCost += examCost
    totalAudioCost += audioCost

    if (exam.created_at >= startOfToday.toISOString()) {
      todayExamCost += examCost
      todayAudioCost += audioCost
    }

    // Group by date
    if (!costByDate.has(date)) {
      costByDate.set(date, { exam: 0, grading: 0, audio: 0, total: 0 })
    }
    const dayCost = costByDate.get(date)!
    dayCost.exam += examCost
    dayCost.audio += audioCost
    dayCost.total += (examCost + audioCost)

    // Group by category
    costByCategory.set(category, (costByCategory.get(category) || 0) + examCost + audioCost)
  })

  // Process grading costs
  gradingCosts?.forEach((grading: any) => {
    const gradingCost = grading.grading_gemini_usage?.estimatedCost || 0
    const date = grading.graded_at.split('T')[0]

    totalGradingCost += gradingCost

    if (grading.graded_at >= startOfToday.toISOString()) {
      todayGradingCost += gradingCost
    }

    // Group by date
    if (!costByDate.has(date)) {
      costByDate.set(date, { exam: 0, grading: 0, audio: 0, total: 0 })
    }
    const dayCost = costByDate.get(date)!
    dayCost.grading += gradingCost
    dayCost.total += gradingCost
  })

  const totalCost = totalExamCost + totalGradingCost + totalAudioCost
  const todayCost = todayExamCost + todayGradingCost + todayAudioCost
  const avgCostPerExam = examCosts?.length > 0 ? totalExamCost / examCosts.length : 0

  return {
    today: {
      total: todayCost,
      exam_creation: todayExamCost,
      grading: todayGradingCost,
      audio: todayAudioCost
    },
    last_30_days: {
      total: totalCost,
      exam_creation: totalExamCost,
      grading: totalGradingCost,
      audio: totalAudioCost,
      exam_count: examCosts?.length || 0,
      grading_count: gradingCosts?.length || 0,
      average_per_exam: avgCostPerExam
    },
    by_date: Array.from(costByDate.entries())
      .map(([date, costs]) => ({ date, ...costs }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    by_category: Array.from(costByCategory.entries())
      .map(([category, cost]) => ({ category, cost }))
      .sort((a, b) => b.cost - a.cost)
  }
}
