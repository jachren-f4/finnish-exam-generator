/**
 * TEST VARIANTS FOR PROMPT OPTIMIZATION EXPERIMENT
 * These are test prompts - NOT for production use
 */

export const PROMPT_VARIANTS = {
  // VARIANT 1: Safe Cleanup (920 chars)
  // Removes only provably unused fields + fixes language bug
  variant1: (category: string, grade?: number) => {
    const categoryDescriptions = {
      mathematics: 'Mathematics and logic problems',
      core_academics: 'Science, history, geography, biology, physics, chemistry, environmental studies, or social studies',
      language_studies: 'Foreign language learning including vocabulary, grammar, translation, and comprehension'
    }

    return `Create an exam from educational content for grade ${grade || 'appropriate'} students.

Write ALL fields (questions, options, correct_answer, explanations) in the source material's language (Finnish→Finnish, English→English, etc.).

RULES:
- Extract facts to test - do NOT copy source sentences verbatim
- Remove "because/since/so" clauses that reveal answers
- Avoid: image references, page numbers, positional phrases
- Questions must be standalone and answerable without source text

Generate exactly 10 questions that test understanding of the educational concepts.

REQUIRED FORMAT:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question text",
      "options": ["First answer option", "Second answer option", "Third answer option", "Fourth answer option"],
      "correct_answer": "First answer option",
      "explanation": "explanation text"
    }
  ]
}

CRITICAL: "options" must contain actual answer text. "correct_answer" must be exact text from options array, NOT a letter.`
  },

  // VARIANT 2: Smart Compression (750 chars)
  // Removes redundancy + simplifies + compresses example
  variant2: (category: string, grade?: number) => {
    return `Grade ${grade || '5'} exam. Write ALL output in source language (Finnish→Finnish, English→English).

RULES:
- Do NOT copy source sentences verbatim
- Remove "because/since/so" clauses (prevents answer leakage)
- No image/page/position references
- Questions must be standalone

Generate exactly 10 questions testing concept understanding.

FORMAT:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "...",
      "options": ["Option 1 text", "Option 2 text", "Option 3 text", "Option 4 text"],
      "correct_answer": "Option 1 text",
      "explanation": "..."
    }
  ]
}

CRITICAL: Use actual text in options/correct_answer, NOT letters (A/B/C/D).`
  },

  // VARIANT 3: Minimal Viable (560 chars)
  // Radical simplification - only essential instructions
  variant3: (category: string, grade?: number) => {
    return `Grade ${grade || '5'} exam in source language (Finnish→Finnish, English→English).

Rules - NO:
• Copying source sentences verbatim
• "Because/since/so" clauses (answer leakage)
• Image/page/diagram references

Generate 10 standalone questions.

Format:
{
  "questions": [{
    "id": 1,
    "type": "multiple_choice",
    "question": "...",
    "options": ["text1", "text2", "text3", "text4"],
    "correct_answer": "text1",
    "explanation": "..."
  }]
}

Use actual text in options/correct_answer (NOT A/B/C/D letters).`
  }
}

// Helper to get variant by name
export function getPromptVariant(variantName: 'variant1' | 'variant2' | 'variant3', category: string = 'core_academics', grade: number = 5): string {
  return PROMPT_VARIANTS[variantName](category, grade)
}
