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
  const functionStartTime = Date.now()
  console.log(`⏱️  [GEMINI-OCR] Starting OCR extraction for ${imageParts.length} images`)
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0 // Reduce hallucinations and improve source fidelity
    }
  })
  
  const ocrPrompt = `STEP 1: Extract text from each image separately
- Process each image individually (numbered 0, 1, 2, etc.)
- Preserve ALL text exactly as it appears: titles, headers, paragraphs, captions
- Maintain page boundaries - do NOT merge or mix content between different images
- Keep each page's content distinct and separate

STEP 2: MANDATORY TOPIC ANALYSIS
Before finalizing the output, you MUST:
1. Examine each image/page separately and identify its main academic subject
2. Determine if all pages belong to the same subject area (e.g., all physics, all biology, all history)
3. If pages contain DIFFERENT academic subjects, note this clearly
4. State your analysis: "Topic detected: [SUBJECT NAME]" or "Mixed topics detected: [LIST SUBJECTS]"

STEP 3: Format output with clear page separation
- Use "=== PAGE X ===" markers to separate different images/pages
- Include your topic analysis in the output
- Preserve original text structure and formatting

Return your response as a JSON object with this exact structure:
{
  "rawText": "=== PAGE 0 ===\\n[text from first image]\\n\\n=== PAGE 1 ===\\n[text from second image]\\n\\n[Topic Analysis: ...]"
}

VALIDATION CHECK before finalizing:
- Verify clear page boundaries are maintained
- Confirm topic analysis is included
- Ensure no content mixing between different pages

Important: Only return the JSON object with the extracted text. Do not include any additional explanations or notes.`

  try {
    const apiCallStartTime = Date.now()
    console.log(`⏱️  [GEMINI-OCR] Sending API request to Gemini (prompt: ${ocrPrompt.length} chars)`)
    
    const result = await model.generateContent([
      ocrPrompt,
      ...imageParts
    ])
    
    console.log(`⏱️  [GEMINI-OCR] Gemini API call completed: ${Date.now() - apiCallStartTime}ms`)

    const response = await result.response
    const text = response.text()
    
    // Extract usage metadata
    const usageMetadata = response.usageMetadata
    const estimatedInputTokens = Math.ceil(ocrPrompt.length / 4)
    const estimatedOutputTokens = Math.ceil(text.length / 4)
    
    const promptTokenCount = usageMetadata?.promptTokenCount || estimatedInputTokens
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || estimatedOutputTokens
    const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
    
    // Calculate costs (Gemini 2.5 Flash Lite pricing as of 2025)
    const inputCostPer1M = 0.10   // $0.10 per 1M input tokens
    const outputCostPer1M = 0.40  // $0.40 per 1M output tokens
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

    const totalProcessingTime = Date.now() - functionStartTime
    console.log(`⏱️  [GEMINI-OCR] OCR extraction completed: ${totalProcessingTime}ms`)
    console.log(`⏱️  [GEMINI-OCR] OCR result: ${rawText.length} chars, ${totalTokenCount} tokens, $${totalCost.toFixed(6)}`)
    
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
  const functionStartTime = Date.now()
  console.log(`⏱️  [GEMINI-PROCESS] Starting question generation for ${files.length} files`)
  console.log(`⏱️  [GEMINI-PROCESS] Custom prompt: ${customPrompt ? 'YES' : 'NO'} (${customPrompt?.length || 0} chars)`)
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0 // Reduce hallucinations and improve source fidelity
    }
  })
  
  try {
    // Prepare image parts for Gemini
    const imageLoadStartTime = Date.now()
    console.log(`⏱️  [GEMINI-PROCESS] Loading ${files.length} image files from disk`)
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
    console.log(`⏱️  [GEMINI-PROCESS] Image loading completed: ${Date.now() - imageLoadStartTime}ms`)

    // Use custom prompt if provided, otherwise use simple extraction
    const promptToUse = customPrompt || `
Extract text from the images and generate exam questions.

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text in Finnish",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation in Finnish"
    }
  ],
  "topic": "Brief topic description",
  "difficulty": "elementary"
}

Important: Return only the JSON object. Generate exactly 10 questions in Finnish based on the image content.`

    // Send request to Gemini
    const apiCallStartTime = Date.now()
    console.log(`⏱️  [GEMINI-PROCESS] Sending question generation request to Gemini`)
    console.log(`⏱️  [GEMINI-PROCESS] Final prompt length: ${promptToUse.length} chars`)
    
    const result = await model.generateContent([
      promptToUse,
      ...imageParts
    ])
    
    console.log(`⏱️  [GEMINI-PROCESS] Gemini API call completed: ${Date.now() - apiCallStartTime}ms`)

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
    
    // Calculate estimated costs (Gemini 2.5 Flash Lite pricing as of 2025)
    const inputCostPer1M = 0.10   // $0.10 per 1M input tokens
    const outputCostPer1M = 0.40  // $0.40 per 1M output tokens
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


    const totalProcessingTime = Date.now() - functionStartTime
    console.log(`⏱️  [GEMINI-PROCESS] Question generation completed: ${totalProcessingTime}ms`)
    console.log(`⏱️  [GEMINI-PROCESS] Result: ${responseText.length} chars, ${totalTokenCount} tokens, $${totalCost.toFixed(6)}`)
    
    // Create simple results without compression
    return files.map(() => ({
      rawText: responseText,
      fullPromptUsed: promptToUse, // Add the actual enhanced prompt sent to Gemini
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