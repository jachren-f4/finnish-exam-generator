import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileMetadata, CompressionSchema } from '@/types'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Unused OCR_COMPRESSION_PROMPT - removed to fix build

export interface GeminiOCRResult {
  rawText: string
  compressed: CompressionSchema
  geminiUsage?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
}

export interface RawOCRResult {
  rawText: string
  usage: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }
}

function attemptJsonRepair(text: string): string | null {
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
    
    // Fix 1: Fix malformed field structures like "type": "fill_in_the_blank": "text"
    // This handles cases where question field is missing and embedded in type field
    repaired = repaired.replace(
      /"type":\s*"([^"]+)":\s*"([^":]+)"/g,
      '"type": "$1",\n      "question": "$2"'
    )
    
    // Fix 2: Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
    
    // Fix 3: Fix unescaped quotes in strings
    repaired = repaired.replace(/([^\\])"([^"]*[^\\])"([^,}\]\s])/g, '$1\\"$2\\"$3')
    
    // Fix 4: Add missing commas between objects
    repaired = repaired.replace(/}\s*{/g, '},\n    {')
    
    // Try to parse the repaired JSON
    const parsed = JSON.parse(repaired)
    
    return JSON.stringify(parsed, null, 2)
    
  } catch (error) {
    return null
  }
}

export async function extractRawTextFromImages(imageParts: any[]): Promise<RawOCRResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
  const ocrPrompt = `Extract all visible text from the provided images accurately.

Return your response as a JSON object with this exact structure:
{
  "rawText": "the complete extracted text from all images"
}

Important: Only return the JSON object with the extracted text. Do not include any additional explanations or notes.`

  try {
    const result = await model.generateContent([
      ocrPrompt,
      ...imageParts
    ])

    const response = await result.response
    const text = response.text()
    
    // Extract usage metadata
    const usageMetadata = response.usageMetadata
    const estimatedInputTokens = Math.ceil(ocrPrompt.length / 4)
    const estimatedOutputTokens = Math.ceil(text.length / 4)
    
    const promptTokenCount = usageMetadata?.promptTokenCount || estimatedInputTokens
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || estimatedOutputTokens
    const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
    
    // Calculate costs
    const inputCostPer1M = 0.075
    const outputCostPer1M = 0.30
    const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
    const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
    const totalCost = inputCost + outputCost

    // Extract raw text from response
    let rawText = text
    if (text.includes('```json') || (text.includes('{') && text.includes('}'))) {
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
        let jsonText = jsonMatch ? jsonMatch[1] : text
        
        if (jsonText.includes('{')) {
          const startIndex = jsonText.indexOf('{')
          const lastBraceIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && lastBraceIndex !== -1) {
            jsonText = jsonText.substring(startIndex, lastBraceIndex + 1)
          }
        }
        
        const parsed = JSON.parse(jsonText)
        rawText = parsed.rawText || text
      } catch (parseError) {
        // If JSON parsing fails, use the original text
        rawText = text
      }
    }

    return {
      rawText,
      usage: {
        promptTokenCount,
        candidatesTokenCount,
        totalTokenCount,
        estimatedCost: totalCost,
        inputCost,
        outputCost,
        model: 'gemini-2.5-flash-lite'
      }
    }
  } catch (error) {
    throw new Error(`Raw OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function processImagesWithGemini(files: FileMetadata[], customPrompt?: string): Promise<GeminiOCRResult[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
  try {
    // Prepare image parts for Gemini
    const imageParts = []
    
    for (const file of files) {
      const fs = require('fs').promises
      const path = require('path')
      const filePath = path.join('/tmp', `${file.id}${path.extname(file.filename)}`)
      
      try {
        const imageBuffer = await fs.readFile(filePath)
        const base64Data = imageBuffer.toString('base64')
        
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.mimeType
          }
        })
      } catch (error) {
        throw new Error(`Failed to read file: ${file.filename}`)
      }
    }

    // Use custom prompt if provided, otherwise use simple OCR prompt
    const promptToUse = customPrompt ? `
First, extract all visible text from the provided images accurately.

Then, ${customPrompt}

Important: Return only the JSON response as specified in the task instructions. Do not include any additional explanations or notes.
` : `
Extract all visible text from the provided images accurately.

Return your response as a JSON object with this exact structure:
{
  "rawText": "the complete extracted text from all images"
}

Important: Only return the JSON object with the extracted text. Do not include any additional explanations or notes.
`

    // Send request to Gemini
    const result = await model.generateContent([
      promptToUse,
      ...imageParts
    ])

    const response = await result.response
    const text = response.text()
    
    // Extract usage metadata from the response
    
    // Use response.usageMetadata as the primary source
    const usageMetadata = response.usageMetadata
    
    // If usage metadata is empty, estimate based on text length (for testing)
    const estimatedInputTokens = Math.ceil(promptToUse.length / 4) // ~4 chars per token
    const estimatedOutputTokens = Math.ceil(text.length / 4) // ~4 chars per token
    
    const promptTokenCount = usageMetadata?.promptTokenCount || estimatedInputTokens
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || estimatedOutputTokens
    const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
    
    // Calculate estimated costs (Gemini 2.5 Flash Lite pricing as of 2024)
    const inputCostPer1M = 0.075  // $0.075 per 1M input tokens
    const outputCostPer1M = 0.30  // $0.30 per 1M output tokens
    const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
    const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
    const totalCost = inputCost + outputCost
    
    
    // Validate and potentially repair JSON if the response looks like JSON
    let responseText = text
    
    // Check if response contains JSON structure
    if (text.includes('```json') || (text.includes('{') && text.includes('}'))) {
      
      try {
        // Extract JSON from markdown if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
        let jsonText = jsonMatch ? jsonMatch[1] : text
        
        // Find JSON object boundaries
        if (jsonText.includes('{')) {
          const startIndex = jsonText.indexOf('{')
          const lastBraceIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
            jsonText = jsonText.substring(startIndex, lastBraceIndex + 1)
          }
        }
        
        // Try to parse - if successful, return cleaned JSON
        const parsed = JSON.parse(jsonText)
        responseText = JSON.stringify(parsed, null, 2)
        
      } catch (parseError) {
        
        // Attempt basic JSON repairs
        const repairedJson = attemptJsonRepair(text)
        if (repairedJson) {
          responseText = repairedJson
        } else {
          responseText = text
        }
      }
    } else {
    }


    // Create simple results without compression
    return files.map(() => ({
      rawText: responseText,
      compressed: {
        vocabulary: { tokens: [], phrases: [] },
        body: { segments: [] },
        stats: {
          originalLength: responseText.length,
          compressedLength: 0,
          compressionRatio: 0,
          tokenCount: 0,
          phraseCount: 0
        }
      },
      geminiUsage: {
        promptTokenCount,
        candidatesTokenCount,
        totalTokenCount,
        estimatedCost: totalCost,
        inputCost,
        outputCost,
        model: 'gemini-2.5-flash-lite'
      }
    }))
    
  } catch (error) {
    throw error
  }
}

export function validateCompressionSchema(compressed: any): boolean {
  try {
    return (
      compressed &&
      compressed.vocabulary &&
      Array.isArray(compressed.vocabulary.tokens) &&
      Array.isArray(compressed.vocabulary.phrases) &&
      compressed.body &&
      Array.isArray(compressed.body.segments) &&
      compressed.stats &&
      typeof compressed.stats.originalLength === 'number' &&
      typeof compressed.stats.compressedLength === 'number' &&
      typeof compressed.stats.compressionRatio === 'number' &&
      typeof compressed.stats.tokenCount === 'number' &&
      typeof compressed.stats.phraseCount === 'number'
    )
  } catch {
    return false
  }
}