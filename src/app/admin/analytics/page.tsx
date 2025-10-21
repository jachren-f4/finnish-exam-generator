'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsData {
  dau: {
    today: number
    yesterday: number
    change_percent: number
    last_30_days: { date: string; users: number }[]
  }
  new_users: {
    today: number
    yesterday: number
    change_percent: number
    last_30_days: { date: string; count: number }[]
  }
  session_length: {
    average_minutes: number
    median_minutes: number
    distribution: { bucket: string; count: number; percentage: number }[]
  }
  exams: {
    today: number
    total: number
    last_30_days: { date: string; count: number }[]
  }
  users: {
    total: number
    active_7d: number
    active_30d: number
  }
  platforms: Record<string, { sessions: number; percentage: number }>
  top_subjects: { subject: string; count: number }[]
  top_categories: { category: string; count: number }[]
  costs: {
    today: {
      total: number
      exam_creation: number
      grading: number
      audio: number
    }
    last_30_days: {
      total: number
      exam_creation: number
      grading: number
      audio: number
      exam_count: number
      grading_count: number
      average_per_exam: number
    }
    by_date: { date: string; exam: number; grading: number; audio: number; total: number }[]
    by_category: { category: string; cost: number }[]
  }
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          Authorization: `Basic ${btoa('admin:U4PwcNaP3ykpqLq5cDwqILNCJ6JPQMBGyVJOXOgkn90=')}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - check admin credentials')
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading analytics...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={fetchAnalytics} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '32px', margin: 0 }}>ExamGenie Analytics</h1>
        <button
          onClick={fetchAnalytics}
          style={{
            padding: '10px 20px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <MetricCard
          title="DAU Today"
          value={data.dau.today}
          change={data.dau.change_percent}
        />
        <MetricCard
          title="New Users"
          value={data.new_users.today}
          change={data.new_users.change_percent}
        />
        <MetricCard
          title="Total Users"
          value={data.users.total}
        />
        <MetricCard
          title="Avg Session"
          value={`${data.session_length.average_minutes.toFixed(1)} min`}
        />
        <MetricCard
          title="Exams Today"
          value={data.exams.today}
        />
      </div>

      {/* Cost Metric Cards */}
      <div style={{ marginBottom: '20px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>💰 Cost Metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <MetricCard
            title="Total Cost Today"
            value={`$${data.costs.today.total.toFixed(4)}`}
          />
          <MetricCard
            title="Cost Last 30d"
            value={`$${data.costs.last_30_days.total.toFixed(2)}`}
          />
          <MetricCard
            title="Avg Cost/Exam"
            value={`$${data.costs.last_30_days.average_per_exam.toFixed(6)}`}
          />
          <MetricCard
            title="Exam Creation"
            value={`$${data.costs.last_30_days.exam_creation.toFixed(4)}`}
          />
          <MetricCard
            title="Grading"
            value={`$${data.costs.last_30_days.grading.toFixed(4)}`}
          />
          <MetricCard
            title="Audio (TTS)"
            value={`$${data.costs.last_30_days.audio.toFixed(4)}`}
          />
        </div>
      </div>

      {/* Cost Over Time - Line Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Cost Breakdown Over Time (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.costs.by_date.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `$${value.toFixed(3)}`} />
            <Tooltip formatter={(value: number) => `$${value.toFixed(6)}`} />
            <Legend />
            <Line type="monotone" dataKey="exam" stroke="#8884d8" name="Exam Creation" strokeWidth={2} />
            <Line type="monotone" dataKey="grading" stroke="#82ca9d" name="Grading" strokeWidth={2} />
            <Line type="monotone" dataKey="audio" stroke="#ffc658" name="Audio (TTS)" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="#ff7c7c" name="Total" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost by Category - Pie Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Cost by Category (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.costs.by_category}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.category}: $${entry.cost.toFixed(3)}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="cost"
            >
              {data.costs.by_category.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toFixed(6)}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Breakdown Table */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Cost Breakdown Summary</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Cost Type</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Today</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Last 30 Days</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>Exam Creation (Gemini)</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.today.exam_creation.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.last_30_days.exam_creation.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {((data.costs.last_30_days.exam_creation / data.costs.last_30_days.total) * 100).toFixed(1)}%
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>Grading (Gemini)</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.today.grading.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.last_30_days.grading.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {((data.costs.last_30_days.grading / data.costs.last_30_days.total) * 100).toFixed(1)}%
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>Audio Generation (TTS)</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.today.audio.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.last_30_days.audio.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {((data.costs.last_30_days.audio / data.costs.last_30_days.total) * 100).toFixed(1)}%
              </td>
            </tr>
            <tr style={{ borderBottom: '2px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
              <td style={{ padding: '12px' }}>Total</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.today.total.toFixed(4)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>${data.costs.last_30_days.total.toFixed(2)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DAU Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Daily Active Users (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dau.last_30_days.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="users" stroke="#8884d8" name="DAU" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New Users Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h2>New Users (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.new_users.last_30_days.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#82ca9d" name="New Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Session Length Distribution */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Session Length Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.session_length.distribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Sessions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Exams Generated */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Exams Generated (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.exams.last_30_days.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" name="Exams" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Breakdown */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Platform Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={Object.entries(data.platforms).map(([name, data]) => ({
                name,
                value: data.sessions,
              }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {Object.keys(data.platforms).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Subjects */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Top Subjects</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Subject</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.top_subjects.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{item.subject}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Categories */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Top Categories</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.top_categories.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{item.category}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard({ title, value, change }: { title: string; value: string | number; change?: number }) {
  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#000' }}>{value}</div>
      {change !== undefined && (
        <div style={{ fontSize: '14px', color: change >= 0 ? 'green' : 'red', marginTop: '4px' }}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs yesterday
        </div>
      )}
    </div>
  )
}
