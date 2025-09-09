import { Job, FileMetadata, OCRResult } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// In-memory job storage (in production, you'd use a database)
// Make it global to survive hot reloads in development
declare global {
  var jobStorage: Map<string, Job> | undefined
}

const jobs = globalThis.jobStorage ?? new Map<string, Job>()
globalThis.jobStorage = jobs

// Cleanup jobs older than 1 hour
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
const JOB_EXPIRY = 60 * 60 * 1000 // 1 hour

setInterval(() => {
  const now = new Date()
  for (const [jobId, job] of jobs.entries()) {
    if (now.getTime() - job.createdAt.getTime() > JOB_EXPIRY) {
      jobs.delete(jobId)
      console.log(`Cleaned up expired job: ${jobId}`)
    }
  }
}, CLEANUP_INTERVAL)

export function createJob(files: FileMetadata[], customPrompt?: string): Job {
  const jobId = uuidv4()
  const job: Job = {
    id: jobId,
    status: 'pending',
    files,
    createdAt: new Date(),
    customPrompt,
  }
  
  jobs.set(jobId, job)
  console.log(`Job created with ID: ${jobId}, total jobs in memory: ${jobs.size}`)
  return job
}

export function getJob(jobId: string): Job | null {
  const job = jobs.get(jobId) || null
  console.log(`Getting job ${jobId}: ${job ? 'found' : 'not found'}, total jobs: ${jobs.size}`)
  if (jobs.size > 0) {
    console.log('Available job IDs:', Array.from(jobs.keys()))
  }
  return job
}

export function updateJobStatus(jobId: string, status: Job['status'], results?: OCRResult[], error?: string): void {
  const job = jobs.get(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  job.status = status
  if (results) {
    job.results = results
  }
  if (error) {
    job.error = error
  }
  if (status === 'completed' || status === 'failed') {
    job.completedAt = new Date()
  }

  jobs.set(jobId, job)
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values())
}

export function deleteJob(jobId: string): boolean {
  return jobs.delete(jobId)
}