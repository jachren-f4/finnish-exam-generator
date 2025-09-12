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

export interface TopicGrouping {
  topics: {
    [key: string]: {
      images: number[]
      subject: string
      keywords: string[]
      content: string
    }
  }
}

export interface StructuredOCRResult {
  topics: TopicGrouping['topics']
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

export async function extractTextWithTopicDetection(imageParts: any[]): Promise<StructuredOCRResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
  const topicDetectionPrompt = `CRITICAL: You are performing OCR (Optical Character Recognition) - extract the EXACT text as it appears in the images, word for word. Do NOT summarize, paraphrase, or rewrite anything.

STEP 1: Perform literal OCR text extraction
- Extract ALL visible text from each image exactly as written
- Preserve original spelling, punctuation, and formatting
- Include titles, headers, paragraphs, captions - everything visible
- Do NOT correct spelling errors or translate words
- Do NOT summarize or condense content

STEP 2: Topic organization
- Group images by topic only AFTER extracting all text literally
- Keep unrelated subjects completely separate

Return your response as a JSON object with this exact structure:
{
  "topics": {
    "topic_1": {
      "images": [0, 1],
      "subject": "Brief topic description",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "content": "EXACT verbatim text from these images - no summarization"
    },
    "topic_2": {
      "images": [2, 3],
      "subject": "Brief topic description", 
      "keywords": ["keyword1", "keyword2"],
      "content": "EXACT verbatim text from these images - no summarization"
    }
  }
}

CRITICAL REQUIREMENTS:
- The content field MUST contain the complete, literal, verbatim text from the images
- Do NOT summarize, rewrite, or interpret the text
- Preserve all original text exactly as it appears
- Only group images about the same topic
- Keep different subjects separate

Return only the JSON object. No additional explanations.`

  try {
    const result = await model.generateContent([
      topicDetectionPrompt,
      ...imageParts
    ])

    const response = await result.response
    const text = response.text()
    
    // Extract usage metadata
    const usageMetadata = response.usageMetadata
    const estimatedInputTokens = Math.ceil(topicDetectionPrompt.length / 4)
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

    // Parse the structured response
    let topics: TopicGrouping['topics'] = {}
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
        topics = parsed.topics || {}
      } catch (parseError) {
        // If JSON parsing fails, create a single topic with all content
        console.warn('Failed to parse topic detection response, creating single topic:', parseError)
        topics = {
          'single_topic': {
            images: Array.from({length: imageParts.length}, (_, i) => i),
            subject: 'Mixed Content',
            keywords: [],
            content: text
          }
        }
      }
    }

    return {
      topics,
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
    throw new Error(`Topic detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function extractRawTextFromImages(imageParts: any[]): Promise<RawOCRResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
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
STEP 1: Extract text from each image separately
- Process each image individually (numbered 0, 1, 2, etc.)
- Preserve ALL text exactly as it appears: titles, headers, paragraphs, captions
- Maintain page boundaries - do NOT merge or mix content between different images
- Keep each page's content distinct and separate

STEP 2: MANDATORY TOPIC ANALYSIS
Before creating any questions, you MUST:
1. Examine each image/page separately and identify its main academic subject
2. Determine if all pages belong to the same subject area (e.g., all physics, all biology, all history)
3. If pages contain DIFFERENT academic subjects, choose the MOST PROMINENT subject and ignore others
4. State your decision: "Topic detected: [SUBJECT NAME]" or "Mixed topics detected - focusing on: [CHOSEN SUBJECT]"

CRITICAL TOPIC SEPARATION RULES:
- NEVER mix different academic subjects (physics + biology, history + chemistry, etc.)
- If you detect unrelated subjects, pick ONE and ignore the rest
- Each question must use content from the same subject area only
- When in doubt, focus on the topic with the most content

STEP 3: Generate questions
${customPrompt.replace('- **Topic relevance**: Only create questions directly related to the main topic and content of the text.', '- **Topic relevance**: Only create questions directly related to the SINGLE TOPIC identified in Step 2.')}

VALIDATION CHECK before finalizing:
- Verify all questions are about the same subject area
- Ensure no mixing of unrelated academic topics
- Confirm topic coherence across all questions

Important: Return only the JSON response as specified in the task instructions. Do not include any additional explanations or notes.
` : `
CRITICAL: Extract text from each image while maintaining clear page separation.

Instructions:
- Process images individually (image 0, image 1, etc.)
- Extract ALL visible text exactly as written: titles, headers, body text, captions
- Do NOT merge or summarize content between different images
- Preserve the distinct content and context of each page
- Include page numbers, chapter titles, and section headers
- Maintain the natural flow and structure of each individual page

Return your response as a JSON object with this exact structure:
{
  "rawText": "the complete extracted text from all images, with clear page separations maintained"
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

export interface StructuredQuestionResult extends GeminiOCRResult {
  fullPromptUsed: string // The complete prompt sent to Gemini
}

export async function generateStructuredQuestions(topics: TopicGrouping['topics'], customPrompt?: string): Promise<StructuredQuestionResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  
  // Create structured content with clear topic separation
  const structuredContent = Object.entries(topics).map(([topicKey, topic]) => {
    return `# ${topic.subject} (Images ${topic.images.join(', ')})

Keywords: ${topic.keywords.join(', ')}

${topic.content}

---`
  }).join('\n\n')

  const basePrompt = customPrompt || `Your task:
- Based on the text, generate exactly **10 exam questions in Finnish**.

CRITICAL Requirements for the questions:
- **ONLY use correct Finnish language**: All words, grammar, and sentences must be proper Finnish. Do not use Swedish, English, or made-up words.
- **Verify OCR accuracy**: If the source text contains non-Finnish words or OCR errors, interpret the context and use correct Finnish equivalents.
- **Perfect grammar**: Use correct Finnish grammar, spelling, and sentence structure. No broken fragments or incomplete sentences.
- **Topic relevance**: Only create questions directly related to the main topic and content of the text.
- **Varied question types**: Use multiple choice, true/false, short answer, fill-in-the-blank in balanced proportions.
- **Appropriate difficulty**: Target elementary/middle school students (ages 7-15).
- **Complete answers**: Include correct answers and explanations for every question.
- **SELF-CONTAINED QUESTIONS ONLY**: Every question must make complete sense without any additional context. NEVER use phrases like "in this context", "according to the text", "in the passage above", or "what does X mean here". If a question needs background information, include that information WITHIN the question itself. Transform contextual references into standalone scenarios that students can understand independently.

Output format:
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
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement in Finnish",
      "correct_answer": true,
      "explanation": "Brief explanation in Finnish"
    },
    {
      "id": 3,
      "type": "short_answer",
      "question": "Question in Finnish",
      "correct_answer": "Expected answer",
      "explanation": "Brief explanation in Finnish"
    }
  ],
  "topic": "Brief description of the main topic covered",
  "difficulty": "elementary|middle_school|high_school"
}

Important: Return only the JSON object. Do not include any additional explanations or markdown formatting.`

  const fullPrompt = `The content below contains text from multiple topics, clearly separated by markdown headers and dividers.

CRITICAL INSTRUCTION: Generate questions that focus on ONE topic at a time. DO NOT mix concepts between different topic sections. Each question should be based entirely on content from a single topic section.

Content:

${structuredContent}

${basePrompt}`

  try {
    const result = await model.generateContent([fullPrompt])
    const response = await result.response
    const text = response.text()
    
    // Extract usage metadata
    const usageMetadata = response.usageMetadata
    const estimatedInputTokens = Math.ceil(fullPrompt.length / 4)
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

    // Validate and potentially repair JSON response
    let responseText = text
    
    if (text.includes('```json') || (text.includes('{') && text.includes('}'))) {
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
        let jsonText = jsonMatch ? jsonMatch[1] : text
        
        if (jsonText.includes('{')) {
          const startIndex = jsonText.indexOf('{')
          const lastBraceIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > startIndex) {
            jsonText = jsonText.substring(startIndex, lastBraceIndex + 1)
          }
        }
        
        const parsed = JSON.parse(jsonText)
        responseText = JSON.stringify(parsed, null, 2)
      } catch (parseError) {
        const repairedJson = attemptJsonRepair(text)
        if (repairedJson) {
          responseText = repairedJson
        } else {
          responseText = text
        }
      }
    }

    return {
      rawText: responseText,
      fullPromptUsed: fullPrompt, // Add the actual enhanced prompt sent to Gemini
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
    }
  } catch (error) {
    throw new Error(`Structured question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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