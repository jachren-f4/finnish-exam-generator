// Enhanced exam data transformer to handle multiple JSON formats

export interface GeminiQuestion {
  id: number | string;
  type: "multiple_choice" | "true_false" | "short_answer" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correct_answer: string | boolean;
  explanation: string;
  max_points?: number;
}

export interface GeminiExamData {
  questions: GeminiQuestion[];
  topic: string;
  difficulty: string;
}

export interface DatabaseExamData {
  exam: {
    subject: string;
    grade: string;
    questions: DatabaseQuestion[];
  };
  metadata?: {
    prompt_used?: string;
    prompt_length?: number;
    created_at?: string;
    [key: string]: any;
  };
}

export interface DatabaseQuestion {
  id: string;
  question_text: string;
  answer_text: string;
  max_points: number;
  question_type?: string;
  options?: string[];
  explanation?: string;
}

/**
 * Transform Gemini response format to database-compatible format
 */
export function transformGeminiToDatabase(geminiData: GeminiExamData): DatabaseExamData {
  // Map difficulty to Finnish grade levels
  const difficultyToGrade: Record<string, string> = {
    'elementary': '1-6. luokka',
    'elementary_school': '1-6. luokka',
    'middle_school': '7-9. luokka', 
    'high_school': '10-12. luokka',
    'general': 'Yleinen taso'
  };

  // Calculate points based on question type
  const getMaxPoints = (question: GeminiQuestion): number => {
    if (question.max_points) return question.max_points;
    
    const pointsMap = {
      'multiple_choice': 2,
      'true_false': 1,
      'short_answer': 3,
      'fill_in_the_blank': 2
    };
    return pointsMap[question.type] || 2;
  };

  // Transform questions
  const questions: DatabaseQuestion[] = geminiData.questions.map((q) => ({
    id: `q${q.id}`,
    question_text: q.question,
    answer_text: typeof q.correct_answer === 'boolean' 
      ? q.correct_answer.toString() 
      : q.correct_answer,
    max_points: getMaxPoints(q),
    question_type: q.type,
    options: q.options,
    explanation: q.explanation
  }));

  return {
    exam: {
      subject: geminiData.topic || 'Yleinen aihe',
      grade: difficultyToGrade[geminiData.difficulty] || 'Yleinen taso',
      questions: questions
    }
  };
}

/**
 * Aggressively clean JSON string with multiple sanitization passes
 */
function sanitizeJsonString(jsonStr: string): string {
  let cleaned = jsonStr;
  
  // Pass 1: Remove BOM and control characters
  cleaned = cleaned
    .replace(/^\uFEFF/, '') // Remove UTF-8 BOM
    .replace(/^[\x00-\x1F]+/, '') // Remove any control characters at start
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove problematic control characters
    .trim();

  // Pass 2: Fix the most common Gemini JSON issues
  cleaned = cleaned
    // CRITICAL: Replace ALL variations of literal \n with spaces
    .replace(/\\n/g, ' ')           // Direct literal \n
    .replace(/\\\s+n/g, ' ')        // Literal \ followed by space(s) and n
    .replace(/\\\r?\n/g, ' ')       // Literal \ followed by actual newline
    // Fix trailing commas
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
    // Fix unquoted property names
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Try multiple JSON parsing strategies with progressive sanitization
 */
function parseJsonRobustly(jsonStr: string): any {
  const strategies = [
    // Strategy 1: Basic sanitization
    () => JSON.parse(sanitizeJsonString(jsonStr)),
    
    // Strategy 2: More aggressive newline handling
    () => {
      let cleaned = sanitizeJsonString(jsonStr)
        .replace(/[\r\n]/g, ' ')           // Remove all actual newlines
        .replace(/\\+n/g, ' ')             // Remove any escaped n variations
        .replace(/\s*{\s*/g, '{')          // Clean up brace spacing
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*\[\s*/g, '[')         // Clean up bracket spacing
        .replace(/\s*\]\s*/g, ']')
        .replace(/\s*:\s*/g, ':')          // Clean up colon spacing
        .replace(/\s*,\s*/g, ',');         // Clean up comma spacing
      return JSON.parse(cleaned);
    },
    
    // Strategy 3: Character-by-character reconstruction
    () => {
      let result = '';
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        const nextChar = jsonStr[i + 1];
        
        if (escapeNext) {
          if (char === 'n' && !inString) {
            result += ' '; // Convert \n to space outside strings
          } else {
            result += char;
          }
          escapeNext = false;
        } else if (char === '\\') {
          if (nextChar === 'n' && !inString) {
            escapeNext = true; // Will be handled in next iteration
          } else {
            result += char;
          }
        } else if (char === '"') {
          inString = !inString;
          result += char;
        } else if (char === '\n' || char === '\r') {
          result += ' '; // Convert actual newlines to spaces
        } else {
          result += char;
        }
      }
      
      return JSON.parse(result.replace(/\s+/g, ' ').trim());
    }
  ];

  let lastError;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying JSON parsing strategy ${i + 1}...`);
      return strategies[i]();
    } catch (error) {
      console.log(`Strategy ${i + 1} failed:`, error.message);
      lastError = error;
      continue;
    }
  }
  
  throw lastError;
}

/**
 * Validate and repair Gemini JSON, then transform to database format
 */
export function processGeminiResponse(rawResponse: string): DatabaseExamData | null {
  try {
    // Check for HTML/DOCTYPE responses (common error case)
    if (rawResponse.includes('<!DOCTYPE') || rawResponse.includes('<html>') || rawResponse.includes('<HTML>')) {
      console.error('Gemini returned HTML instead of JSON:', rawResponse.substring(0, 200));
      throw new Error('Gemini returned HTML response instead of JSON');
    }
    
    // Check for other non-JSON indicators
    if (rawResponse.trim().startsWith('<') && !rawResponse.includes('```json')) {
      console.error('Gemini returned XML/HTML instead of JSON:', rawResponse.substring(0, 200));
      throw new Error('Gemini returned non-JSON response');
    }
    
    // Parse the raw response
    let rawData: any;
    
    // Handle both raw JSON and markdown-wrapped JSON
    if (rawResponse.includes('```json')) {
      // Try multiple markdown patterns
      const patterns = [
        /```json\s*\n([\s\S]*?)\n```/,  // Original pattern
        /```json\s*([\s\S]*?)```/,      // More flexible pattern
        /```json\s*\n([\s\S]*?)```/,    // No closing newline
        /```json([\s\S]*?)```/          // No whitespace after json
      ];
      
      let jsonMatch = null;
      for (const pattern of patterns) {
        jsonMatch = rawResponse.match(pattern);
        if (jsonMatch) break;
      }
      
      if (jsonMatch) {
        console.log('Extracted JSON from markdown, first 200 chars:', jsonMatch[1].substring(0, 200));
        console.log('Character codes at start:', Array.from(jsonMatch[1].substring(0, 20)).map(c => `${c}(${c.charCodeAt(0)})`));
        rawData = parseJsonRobustly(jsonMatch[1]);
      } else {
        console.error('Could not extract JSON from markdown. Raw response:', rawResponse.substring(0, 300));
        throw new Error('Could not extract JSON from markdown');
      }
    } else {
      console.log('Attempting to parse raw JSON, first 200 chars:', rawResponse.substring(0, 200));
      console.log('Character codes at start:', Array.from(rawResponse.substring(0, 20)).map(c => `${c}(${c.charCodeAt(0)})`));
      rawData = parseJsonRobustly(rawResponse);
    }

    // Validate required fields
    if (!rawData.questions || !Array.isArray(rawData.questions)) {
      throw new Error('Invalid questions format');
    }

    // Handle backward compatibility - convert old format to new format
    let geminiData: GeminiExamData;
    
    // Check if this is the old format (has "q" field instead of "question")
    const isOldFormat = rawData.questions.some((q: any) => q.q && !q.question);
    
    if (isOldFormat) {
      console.log('Detected old JSON format, converting to new format');
      // Convert old format to new format
      geminiData = {
        questions: rawData.questions.map((q: any, index: number) => ({
          id: index + 1,
          type: q.choices ? 'multiple_choice' : 'short_answer',
          question: q.q || q.question,
          options: q.choices,
          correct_answer: q.answer || q.correct_answer,
          explanation: q.explanation || 'Selvitys ei ole saatavilla'
        })),
        topic: rawData.topic || 'Yleinen aihe',
        difficulty: rawData.difficulty || 'general'
      };
    } else {
      // New format, use as-is
      geminiData = rawData as GeminiExamData;
    }

    // Set defaults for missing fields
    if (!geminiData.topic) geminiData.topic = 'Yleinen aihe';
    if (!geminiData.difficulty) geminiData.difficulty = 'general';

    // Transform to database format
    return transformGeminiToDatabase(geminiData);
    
  } catch (error) {
    console.error('Error processing Gemini response:', error);
    return null;
  }
}

/**
 * Create fallback exam data when Gemini fails
 */
export function createFallbackExam(rawText: string): DatabaseExamData {
  return {
    exam: {
      subject: 'Tekstin analyysi',
      grade: 'Yleinen taso',
      questions: [
        {
          id: 'q1',
          question_text: 'Analysoi seuraava teksti ja kirjoita yhteenveto:',
          answer_text: 'Vapaa vastaus tekstin perusteella',
          max_points: 5,
          question_type: 'short_answer',
          explanation: `Teksti: ${rawText.substring(0, 500)}${rawText.length > 500 ? '...' : ''}`
        }
      ]
    }
  };
}

/**
 * Validate exam data structure
 */
export function validateExamData(data: any): data is DatabaseExamData {
  return (
    data &&
    data.exam &&
    typeof data.exam.subject === 'string' &&
    typeof data.exam.grade === 'string' &&
    Array.isArray(data.exam.questions) &&
    data.exam.questions.every((q: any) => 
      q.id && q.question_text && q.answer_text && typeof q.max_points === 'number'
    )
  );
}