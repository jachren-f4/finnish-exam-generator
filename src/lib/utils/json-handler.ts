/**
 * Centralized JSON processing utilities for handling Gemini AI responses
 * Extracted from gemini.ts to eliminate code duplication
 */

export interface JsonExtractionResult {
  success: boolean
  data: any | null
  error: string | null
  method: 'direct' | 'markdown' | 'repair' | 'failed'
}

/**
 * Attempts to repair malformed JSON by fixing common issues
 * Extracted from gemini.ts:40-83
 */
export function attemptJsonRepair(text: string): string | null {
  try {
    // Extract potential JSON from markdown or raw text
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
    let jsonText = jsonMatch ? jsonMatch[1] : text

    // Find JSON boundaries
    if (jsonText.includes('{')) {
      const startIndex = jsonText.indexOf('{')
      const lastBraceIndex = jsonText.lastIndexOf('}')
      if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
        jsonText = jsonText.substring(startIndex, lastBraceIndex + 1)
      }
    }

    // Common repair patterns
    let repaired = jsonText

    // Fix 0: Fix LaTeX backslashes that aren't properly escaped
    // This is critical for math content where Gemini may output \frac, \cdot, etc.
    // Match backslashes that are NOT already escaped (not preceded by \)
    // AND not part of valid JSON escape sequences
    // Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
    const beforeLatexFix = repaired.length
    const beforeSample = repaired.substring(400, 450)
    // Use negative lookbehind to avoid matching already-escaped backslashes
    repaired = repaired.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\')
    const afterLatexFix = repaired.length
    const afterSample = repaired.substring(400, 450)
    if (afterLatexFix !== beforeLatexFix) {
      console.log(`🔧 Applied LaTeX backslash fix: ${afterLatexFix - beforeLatexFix} chars added`)
      console.log(`   Before (pos 400-450): ${JSON.stringify(beforeSample)}`)
      console.log(`   After (pos 400-450): ${JSON.stringify(afterSample)}`)
    }
    
    // Fix 1: Fix malformed field structures like "type": "fill_in_the_blank": "text"
    // This handles cases where question field is missing and embedded in type field
    repaired = repaired.replace(
      /"type":\s*"([^"]+)":\s*"([^":]+)"/g,
      '"type": "$1",\n      "question": "$2"'
    )
    
    // Fix 2: Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

    // Fix 3: Add missing commas between objects
    // Only match object boundaries that are likely JSON array elements, not LaTeX
    // Look for closing brace, optional whitespace, then opening brace at line start
    repaired = repaired.replace(/}\s*\n\s*{/g, '},\n    {')
    
    // Try to parse the repaired JSON
    try {
      const parsed = JSON.parse(repaired)
      return JSON.stringify(parsed, null, 2)
    } catch (parseError) {
      // Save the repaired JSON for debugging
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs')
          fs.writeFileSync('debug-repaired.txt', repaired)
          console.log('💾 Saved repaired JSON to debug-repaired.txt for inspection')
        } catch (fsError) {
          // Ignore file system errors
        }
      }
      throw parseError
    }

  } catch (error) {
    return null
  }
}

/**
 * Extracts JSON content from text that may be wrapped in markdown or mixed with other content
 */
export function extractJsonFromText(text: string): string | null {
  try {
    // Try extracting from markdown blocks first
    const markdownMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
    if (markdownMatch) {
      return markdownMatch[1].trim()
    }

    // Look for JSON object boundaries
    if (text.includes('{') && text.includes('}')) {
      const startIndex = text.indexOf('{')
      const lastBraceIndex = text.lastIndexOf('}')
      if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
        return text.substring(startIndex, lastBraceIndex + 1)
      }
    }

    return text.trim()
  } catch (error) {
    return null
  }
}

/**
 * Safe JSON parsing with multiple fallback strategies
 * Combines extraction, repair, and error handling
 */
export function safeJsonParse(text: string): JsonExtractionResult {
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Invalid input: text is empty or not a string',
      method: 'failed'
    }
  }

  // Strategy 1: Try direct parsing
  try {
    const parsed = JSON.parse(text)
    return {
      success: true,
      data: parsed,
      error: null,
      method: 'direct'
    }
  } catch (directError) {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown/mixed content and parse
  const extractedJson = extractJsonFromText(text)
  if (extractedJson) {
    try {
      const parsed = JSON.parse(extractedJson)
      return {
        success: true,
        data: parsed,
        error: null,
        method: 'markdown'
      }
    } catch (markdownError) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Attempt JSON repair
  const repairedJson = attemptJsonRepair(text)
  if (repairedJson) {
    try {
      const parsed = JSON.parse(repairedJson)
      return {
        success: true,
        data: parsed,
        error: null,
        method: 'repair'
      }
    } catch (repairError) {
      // Continue to failure
    }
  }

  // All strategies failed
  return {
    success: false,
    data: null,
    error: `Failed to parse JSON after trying all strategies. Original text length: ${text.length}`,
    method: 'failed'
  }
}

/**
 * Validates that a parsed object has the expected structure for different response types
 */
export interface ResponseValidationSchema {
  required: string[]
  optional?: string[]
  nested?: { [key: string]: ResponseValidationSchema }
}

export function validateResponseStructure(data: any, schema: ResponseValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  // Check required fields
  for (const field of schema.required) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate nested structures
  if (schema.nested) {
    for (const [field, nestedSchema] of Object.entries(schema.nested)) {
      if (field in data) {
        if (Array.isArray(data[field])) {
          // Validate each item in array
          data[field].forEach((item: any, index: number) => {
            const result = validateResponseStructure(item, nestedSchema)
            if (!result.valid) {
              errors.push(...result.errors.map(err => `${field}[${index}]: ${err}`))
            }
          })
        } else {
          // Validate single nested object
          const result = validateResponseStructure(data[field], nestedSchema)
          if (!result.valid) {
            errors.push(...result.errors.map(err => `${field}: ${err}`))
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Common validation schemas
export const EXAM_RESPONSE_SCHEMA: ResponseValidationSchema = {
  required: ['questions'],
  optional: ['topic', 'difficulty'],
  nested: {
    questions: {
      required: ['id', 'type', 'question'],
      optional: ['options', 'correct_answer', 'explanation', 'max_points']
    }
  }
}

export const OCR_RESPONSE_SCHEMA: ResponseValidationSchema = {
  required: ['rawText'],
  optional: []
}

/**
 * Convenience function to parse and validate Gemini responses for exam generation
 */
export function parseExamResponse(text: string): JsonExtractionResult & { validationErrors?: string[] } {
  const result = safeJsonParse(text)
  
  if (result.success && result.data) {
    const validation = validateResponseStructure(result.data, EXAM_RESPONSE_SCHEMA)
    return {
      ...result,
      validationErrors: validation.errors
    }
  }
  
  return result
}

/**
 * Convenience function to parse and validate Gemini responses for OCR extraction
 */
export function parseOcrResponse(text: string): JsonExtractionResult & { validationErrors?: string[] } {
  const result = safeJsonParse(text)
  
  if (result.success && result.data) {
    const validation = validateResponseStructure(result.data, OCR_RESPONSE_SCHEMA)
    return {
      ...result,
      validationErrors: validation.errors
    }
  }
  
  return result
}