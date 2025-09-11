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
 * Clean JSON string by removing control characters that break JSON.parse()
 */
function sanitizeJsonString(jsonStr: string): string {
  return jsonStr
    // Remove BOM and other invisible characters at the start
    .replace(/^\uFEFF/, '') // Remove UTF-8 BOM
    .replace(/^[\x00-\x1F]+/, '') // Remove any control characters at start
    // Remove problematic control characters but preserve valid JSON formatting
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove problematic control characters
    // Fix literal \n strings that should be actual newlines in JSON structure
    .replace(/\\n/g, '\n')  // Convert literal \n back to actual newlines
    // Only fix newlines INSIDE string values, not JSON structure newlines  
    .replace(/"([^"]*)\r\n([^"]*)"/g, '"$1\\n$2"') // Fix CRLF inside string values
    .replace(/"([^"]*)\r([^"]*)"/g, '"$1\\n$2"')   // Fix CR inside string values
    .replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"')   // Fix LF inside string values
    // Trim whitespace
    .trim()
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
        const cleanedJson = sanitizeJsonString(jsonMatch[1]);
        console.log('Extracted JSON from markdown, first 200 chars:', cleanedJson.substring(0, 200));
        rawData = JSON.parse(cleanedJson);
      } else {
        console.error('Could not extract JSON from markdown. Raw response:', rawResponse.substring(0, 300));
        throw new Error('Could not extract JSON from markdown');
      }
    } else {
      const cleanedJson = sanitizeJsonString(rawResponse);
      console.log('Attempting to parse JSON, first 200 chars:', cleanedJson.substring(0, 200));
      console.log('Character codes at start:', Array.from(cleanedJson.substring(0, 10)).map(c => c.charCodeAt(0)));
      rawData = JSON.parse(cleanedJson);
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