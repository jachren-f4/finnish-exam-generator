/**
 * Centralized cost calculation utilities for Gemini API usage tracking
 * Extracted from gemini.ts and exam-service.ts to eliminate duplication
 */

import { GEMINI_CONFIG } from '../config'

export interface GeminiUsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
  estimatedCost: number
  inputCost: number
  outputCost: number
  model: string
}

export interface CostCalculationOptions {
  model?: string
  inputCostPer1M?: number
  outputCostPer1M?: number
}

/**
 * Calculates cost for Gemini API calls based on token usage
 * Extracted from gemini.ts:150-155 and exam-service.ts:393-403
 */
export function calculateGeminiCost(
  promptTokenCount: number,
  candidatesTokenCount: number,
  options: CostCalculationOptions = {}
): GeminiUsageMetadata {
  const {
    model = GEMINI_CONFIG.MODEL_NAME,
    inputCostPer1M = GEMINI_CONFIG.PRICING.INPUT_COST_PER_1M,
    outputCostPer1M = GEMINI_CONFIG.PRICING.OUTPUT_COST_PER_1M
  } = options

  const totalTokenCount = promptTokenCount + candidatesTokenCount
  const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
  const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
  const estimatedCost = inputCost + outputCost

  return {
    promptTokenCount,
    candidatesTokenCount,
    totalTokenCount,
    estimatedCost,
    inputCost,
    outputCost,
    model
  }
}

/**
 * Estimates token count based on text length for cases where usage metadata is not available
 * Uses the common approximation of ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Creates usage metadata from response when actual metadata might be missing
 * Falls back to text-based estimation if needed
 */
export function createUsageMetadata(
  promptText: string,
  responseText: string,
  actualUsageMetadata?: any,
  options: CostCalculationOptions = {}
): GeminiUsageMetadata {
  // Use actual metadata if available, otherwise estimate
  const promptTokenCount = actualUsageMetadata?.promptTokenCount || estimateTokenCount(promptText)
  const candidatesTokenCount = actualUsageMetadata?.candidatesTokenCount || estimateTokenCount(responseText)

  return calculateGeminiCost(promptTokenCount, candidatesTokenCount, {
    ...options,
    // Override with actual total if provided
    ...(actualUsageMetadata?.totalTokenCount && {
      totalTokenCount: actualUsageMetadata.totalTokenCount
    })
  })
}

/**
 * Aggregates multiple Gemini API usage metadata records
 * Extracted from exam-service.ts:585-604
 */
export function aggregateUsageMetadata(usageRecords: (GeminiUsageMetadata | undefined | null)[]): GeminiUsageMetadata {
  const validRecords = usageRecords.filter(Boolean) as GeminiUsageMetadata[]
  
  if (validRecords.length === 0) {
    return {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
      inputCost: 0,
      outputCost: 0,
      estimatedCost: 0,
      model: GEMINI_CONFIG.MODEL_NAME
    }
  }

  const aggregated = validRecords.reduce(
    (acc, record) => ({
      promptTokenCount: acc.promptTokenCount + (record.promptTokenCount || 0),
      candidatesTokenCount: acc.candidatesTokenCount + (record.candidatesTokenCount || 0),
      totalTokenCount: acc.totalTokenCount + (record.totalTokenCount || 0),
      inputCost: acc.inputCost + (record.inputCost || 0),
      outputCost: acc.outputCost + (record.outputCost || 0),
      estimatedCost: acc.estimatedCost + (record.estimatedCost || 0),
      model: record.model || GEMINI_CONFIG.MODEL_NAME
    }),
    {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
      inputCost: 0,
      outputCost: 0,
      estimatedCost: 0,
      model: GEMINI_CONFIG.MODEL_NAME
    }
  )

  return aggregated
}

/**
 * Formats cost for display in logs and user interfaces
 */
export function formatCostDisplay(cost: number, precision: number = 6): string {
  return `$${cost.toFixed(precision)}`
}

/**
 * Formats usage metadata for logging
 */
export function formatUsageForLogging(usage: GeminiUsageMetadata): string {
  return `${usage.totalTokenCount} tokens, ${formatCostDisplay(usage.estimatedCost)}`
}

/**
 * Logs Gemini API usage in a consistent format
 */
export function logGeminiUsage(
  operation: string,
  usage: GeminiUsageMetadata,
  additionalInfo?: Record<string, any>
): void {
  const baseLog = `${operation} - Input: ${usage.promptTokenCount}, Output: ${usage.candidatesTokenCount}, Cost: ${formatCostDisplay(usage.estimatedCost)}`
  
  if (additionalInfo) {
    const additionalStr = Object.entries(additionalInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    console.log(`${baseLog}, ${additionalStr}`)
  } else {
    console.log(baseLog)
  }
}

/**
 * Validates that usage metadata contains expected fields
 */
export function validateUsageMetadata(usage: any): usage is GeminiUsageMetadata {
  return (
    typeof usage === 'object' &&
    usage !== null &&
    typeof usage.promptTokenCount === 'number' &&
    typeof usage.candidatesTokenCount === 'number' &&
    typeof usage.totalTokenCount === 'number' &&
    typeof usage.estimatedCost === 'number' &&
    typeof usage.inputCost === 'number' &&
    typeof usage.outputCost === 'number' &&
    typeof usage.model === 'string'
  )
}

/**
 * Cost tracking utilities for different operation types
 */
export const CostTracker = {
  /**
   * Track OCR operation costs
   */
  trackOcrCost(usage: GeminiUsageMetadata): void {
    logGeminiUsage('OCR extraction', usage)
  },

  /**
   * Track question generation costs
   */
  trackQuestionGenerationCost(usage: GeminiUsageMetadata, questionCount?: number): void {
    logGeminiUsage('Question generation', usage, questionCount ? { questions: questionCount } : undefined)
  },

  /**
   * Track grading operation costs
   */
  trackGradingCost(usage: GeminiUsageMetadata, questionsGraded?: number): void {
    logGeminiUsage('Grading', usage, questionsGraded ? { graded: questionsGraded } : undefined)
  },

  /**
   * Track total request costs
   */
  trackTotalCost(usage: GeminiUsageMetadata, operation: string): void {
    logGeminiUsage(`Total ${operation}`, usage)
  }
}