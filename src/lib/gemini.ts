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

function attemptJsonRepair(text: string): string | null {
  try {
    console.log('Starting JSON repair attempt')
    
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
    console.log('JSON repair successful!')
    
    return JSON.stringify(parsed, null, 2)
    
  } catch (error) {
    console.error('JSON repair failed:', error)
    return null
  }
}

export async function processImagesWithGemini(files: FileMetadata[], customPrompt?: string): Promise<GeminiOCRResult[]> {
  console.log(`Starting Gemini processing for ${files.length} files`)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
  try {
    // Prepare image parts for Gemini
    const imageParts = []
    
    for (const file of files) {
      const fs = require('fs').promises
      const path = require('path')
      const filePath = path.join('/tmp', `${file.id}${path.extname(file.filename)}`)
      
      try {
        console.log(`Reading file: ${filePath}`)
        const imageBuffer = await fs.readFile(filePath)
        const base64Data = imageBuffer.toString('base64')
        console.log(`Successfully read file ${file.filename}, size: ${imageBuffer.length} bytes`)
        
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.mimeType
          }
        })
      } catch (error) {
        console.error(`Error reading file ${file.filename} at ${filePath}:`, error)
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
    console.log('Full response object keys:', Object.keys(response))
    console.log('Response usageMetadata:', response.usageMetadata)
    console.log('Result object keys:', Object.keys(result))
    
    // Use response.usageMetadata as the primary source
    const usageMetadata = response.usageMetadata
    
    // If usage metadata is empty, estimate based on text length (for testing)
    const estimatedInputTokens = Math.ceil(promptToUse.length / 4) // ~4 chars per token
    const estimatedOutputTokens = Math.ceil(text.length / 4) // ~4 chars per token
    
    const promptTokenCount = usageMetadata?.promptTokenCount || estimatedInputTokens
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || estimatedOutputTokens
    const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
    
    // Calculate estimated costs (Gemini 1.5 Flash pricing as of 2024)
    const inputCostPer1M = 0.075  // $0.075 per 1M input tokens
    const outputCostPer1M = 0.30  // $0.30 per 1M output tokens
    const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
    const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
    const totalCost = inputCost + outputCost
    
    console.log('=== GEMINI API RESPONSE START ===')
    console.log('Custom prompt was:', customPrompt ? 'YES' : 'NO')
    console.log('Prompt sent to Gemini:')
    console.log(promptToUse)
    console.log('=== TOKEN USAGE ===')
    console.log('Raw usageMetadata object:', JSON.stringify(usageMetadata, null, 2))
    console.log('Using estimated values:', usageMetadata?.promptTokenCount ? 'NO' : 'YES')
    console.log('Input tokens:', promptTokenCount, usageMetadata?.promptTokenCount ? '(real)' : '(estimated)')
    console.log('Output tokens:', candidatesTokenCount, usageMetadata?.candidatesTokenCount ? '(real)' : '(estimated)')
    console.log('Total tokens:', totalTokenCount)
    console.log('Estimated cost: $' + totalCost.toFixed(6))
    console.log('Will include in result:', {
      promptTokenCount,
      candidatesTokenCount,
      totalTokenCount,
      estimatedCost: totalCost,
      inputCost,
      outputCost,
      model: 'gemini-2.5-flash-lite'
    })
    console.log('=== RAW GEMINI RESPONSE ===')
    console.log(text)
    console.log('=== GEMINI API RESPONSE END ===')
    
    // Validate and potentially repair JSON if the response looks like JSON
    console.log('Checking if response contains JSON that needs validation')
    let responseText = text
    
    // Check if response contains JSON structure
    if (text.includes('```json') || (text.includes('{') && text.includes('}'))) {
      console.log('Response appears to contain JSON, attempting validation')
      
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
        console.log('JSON is valid, using parsed and re-stringified version')
        responseText = JSON.stringify(parsed, null, 2)
        
      } catch (parseError) {
        console.error('JSON validation failed, attempting repair:', parseError)
        
        // Attempt basic JSON repairs
        const repairedJson = attemptJsonRepair(text)
        if (repairedJson) {
          console.log('JSON repair successful')
          responseText = repairedJson
        } else {
          console.log('JSON repair failed, using raw response')
          responseText = text
        }
      }
    } else {
      console.log('Response does not appear to contain JSON, using as-is')
    }

    console.log('Final response text length:', responseText.length)

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
    console.error('Error processing images with Gemini:', error)
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