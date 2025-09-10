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
 * Validate and repair Gemini JSON, then transform to database format
 */
export function processGeminiResponse(rawResponse: string): DatabaseExamData | null {
  try {
    // Parse the raw response
    let geminiData: GeminiExamData;
    
    // Handle both raw JSON and markdown-wrapped JSON
    if (rawResponse.includes('```json')) {
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        geminiData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not extract JSON from markdown');
      }
    } else {
      geminiData = JSON.parse(rawResponse);
    }

    // Validate required fields
    if (!geminiData.questions || !Array.isArray(geminiData.questions)) {
      throw new Error('Invalid questions format');
    }

    // Set defaults for missing fields
    if (!geminiData.topic) geminiData.topic = 'Yleinen aihe';
    if (!geminiData.difficulty) geminiData.difficulty = 'general';

    // Transform to database format
    return transformGeminiToDatabase(geminiData);
    
  } catch (error) {
    console.error('Failed to process Gemini response:', error);
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