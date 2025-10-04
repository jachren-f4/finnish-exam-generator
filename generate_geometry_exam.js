const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const prompt = `ROLE: You are an expert Finnish mathematics teacher creating exam questions for grade 8 students studying circle geometry.

CONTEXT: You are analyzing a textbook image containing mathematical content about circle sectors, arc lengths, and angles.

CRITICAL - CONTENT DIFFICULTY ANALYSIS:
Before generating questions, analyze the ACTUAL difficulty level of the material shown:
1. Identify the specific mathematical concepts (not just "geometry" - be specific: "circle sector area calculations with π")
2. Assess complexity: basic, intermediate, or advanced within the grade level
3. Note prerequisites needed (e.g., "requires understanding of π calculations and formulas")
4. Match question difficulty to the EXACT level shown in the images

Example:
- Image shows: "Calculate sector area with radius 5.3cm, angle 135°"
- Difficulty: ADVANCED (requires π, fractions, formula application)
- DO NOT generate: "What is the perimeter of a rectangle?" (too basic)
- DO generate: Questions matching the sector/arc/π complexity level

TASK: Generate 8 exam questions that MATCH THE EXACT DIFFICULTY LEVEL of the mathematical concepts shown in this textbook image.

IMPORTANT REQUIREMENTS:
1. Questions MUST be in Finnish
2. Difficulty MUST MATCH the actual complexity shown in the images (not generic grade level)
3. Cover different aspects of the specific topics shown (sector area, arc length, central angles)
4. Mix of question types: 5 numeric calculations, 2 word problems, 1 multiple choice
5. No references to "kuva" or "kuvassa" - create standalone questions
6. All mathematical expressions MUST use valid LaTeX syntax
7. Use the SAME formulas, concepts, and difficulty level as the source material

MATHEMATICAL NOTATION:
- All math expressions MUST be provided in LaTeX format
- Use proper LaTeX syntax: \\frac{\\alpha}{360°}, \\pi, r^2
- Put inline LaTeX directly in question_text (e.g., "kun säde on $r = 5$ cm")
- Use question_latex ONLY for displaying formulas separately (e.g., "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$")
- Do NOT duplicate the entire question text in question_latex
- Ensure LaTeX is valid and renderable with KaTeX

OUTPUT FORMAT:
You MUST respond with a valid JSON object with this structure:

{
  "exam_metadata": {
    "topic": "Ympyräsektorit ja kaaret",
    "grade_level": 8,
    "difficulty": "advanced",
    "estimated_time_minutes": 45
  },
  "questions": [
    {
      "question_id": "q_001",
      "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm ja keskuskulma on $\\alpha = 72°$.",
      "question_latex": "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
      "question_display_mode": "block",

      "answer_type": "numeric",
      "answer_format": {
        "type": "decimal",
        "tolerance": 0.5,
        "units": "cm²"
      },

      "correct_answer": {
        "value": 26.54,
        "display": "26.5 cm²"
      },

      "grading_rules": {
        "match_type": "numeric_tolerance",
        "tolerance": 0.5
      },

      "explanation": "Sektorin pinta-ala lasketaan kaavalla $A = \\frac{\\alpha}{360°} \\times \\pi r^2$. Sijoita arvot: $A = \\frac{72°}{360°} \\times \\pi (6.5)^2 \\approx 26.5$ cm².",
      "explanation_latex": "$A = \\frac{72°}{360°} \\times \\pi (6.5)^2 \\approx 26.5$ cm²",

      "difficulty": "medium",
      "curriculum_topic": "circle_sectors",
      "estimated_time_seconds": 180
    }
  ]
}

VALIDATION RULES:
1. Every question MUST have a valid answer_type: "numeric" or "multiple_choice"
2. Numeric answers must include tolerance and units
3. All LaTeX MUST be valid KaTeX syntax
4. Multiple choice questions MUST have exactly 4 options (A, B, C, D)
5. Solutions MUST be mathematically correct
6. Explanations MUST be clear and educational in Finnish
7. IMPORTANT: For multiple choice questions, do NOT use lettered sub-parts (a, b, c) in the question text itself - keep questions simple and direct

QUALITY CHECKLIST:
☐ Questions match the ADVANCED level shown in the image (π calculations, formulas)
☐ Mix of sector area, arc length, and angle calculations
☐ Real-world applications included
☐ All LaTeX notation is correct
☐ Answers are mathematically verified
☐ No references to "kuvassa" or "the image"

SELF-VALIDATION:
After generating each question:
1. Verify the answer is mathematically correct by solving it yourself
2. Check LaTeX syntax is valid (no special characters unescaped)
3. Ensure difficulty matches the textbook page (ADVANCED with π)

Generate 8 questions now in valid JSON format.`;

async function generateExam() {
  try {
    console.log('🚀 Starting Gemini exam generation...\n');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Read image
    const imagePath = path.join(__dirname, 'assets/images/math8thgrade/IMG_6248.JPG');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('📸 Image loaded:', imagePath);
    console.log('📝 Sending prompt to Gemini 2.5 Flash-Lite...\n');

    // Generate content
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8000,
        topP: 0.95,
      },
    });

    const responseText = result.response.text();
    console.log('✅ Received response from Gemini\n');
    console.log('📄 Raw response length:', responseText.length, 'characters\n');

    // Save raw response for debugging
    const rawResponsePath = path.join(__dirname, 'gemini_raw_response.txt');
    fs.writeFileSync(rawResponsePath, responseText);
    console.log('💾 Raw response saved to:', rawResponsePath);

    // Parse JSON
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }

    // Save cleaned JSON text for debugging
    const cleanedJsonPath = path.join(__dirname, 'gemini_cleaned_json.txt');
    fs.writeFileSync(cleanedJsonPath, jsonText);
    console.log('💾 Cleaned JSON saved to:', cleanedJsonPath);

    let examData;
    try {
      examData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('📍 Error position:', parseError.message.match(/position (\d+)/)?.[1]);

      // Try to fix common LaTeX escape issues
      console.log('\n🔧 Attempting to fix LaTeX escape sequences...');

      // The issue: Gemini generates LaTeX like $56^{\circ}$ but doesn't escape the backslash
      // In JSON strings, backslashes must be doubled: \\circ not \circ
      // We need to properly escape backslashes that come before LaTeX commands

      // Fix by escaping ALL single backslashes within JSON string values
      // This regex finds all backslashes that aren't already escaped and escapes them
      let fixedJson = jsonText.replace(/\\/g, '\\\\');

      try {
        examData = JSON.parse(fixedJson);
        console.log('✅ Fixed! JSON parsed after LaTeX escape correction\n');
      } catch (secondError) {
        console.error('❌ Still failed after attempted fix');
        console.error('Second error:', secondError.message);

        // Save the attempted fix for debugging
        const fixedJsonPath = path.join(__dirname, 'gemini_fixed_attempt.txt');
        fs.writeFileSync(fixedJsonPath, fixedJson);
        console.error('💾 Attempted fix saved to:', fixedJsonPath);

        throw parseError; // throw original error
      }
    }

    console.log('✅ JSON parsed successfully');
    console.log('📊 Exam metadata:', examData.exam_metadata);
    console.log('📝 Questions generated:', examData.questions.length);
    console.log('');

    // Save to file
    const outputPath = path.join(__dirname, 'gemini_generated_geometry_exam.json');
    fs.writeFileSync(outputPath, JSON.stringify(examData, null, 2));
    console.log('💾 Saved to:', outputPath);

    // Quality assessment
    console.log('\n🔍 QUALITY ASSESSMENT:\n');

    let score = 0;
    let maxScore = 0;

    // Check question count
    maxScore++;
    if (examData.questions.length === 8) {
      console.log('✅ Question count: 8/8 correct');
      score++;
    } else {
      console.log(`❌ Question count: ${examData.questions.length}/8 (expected 8)`);
    }

    // Check difficulty level
    maxScore++;
    const hasPiQuestions = examData.questions.some(q =>
      (q.question_latex && q.question_latex.includes('\\pi')) ||
      (q.question_text && q.question_text.toLowerCase().includes('pii'))
    );
    if (hasPiQuestions) {
      console.log('✅ Advanced topics: π calculations present');
      score++;
    } else {
      console.log('❌ Advanced topics: Missing π calculations');
    }

    // Check LaTeX validity
    maxScore++;
    const allHaveLatex = examData.questions.every(q => q.question_latex || q.answer_type === 'multiple_choice');
    if (allHaveLatex) {
      console.log('✅ LaTeX: Present in questions');
      score++;
    } else {
      console.log('⚠️  LaTeX: Some questions missing LaTeX');
    }

    // Check for image references
    maxScore++;
    const hasImageRefs = examData.questions.some(q =>
      q.question_text.toLowerCase().includes('kuva') ||
      q.question_text.toLowerCase().includes('image')
    );
    if (!hasImageRefs) {
      console.log('✅ No image references: Clean standalone questions');
      score++;
    } else {
      console.log('❌ Image references found in questions');
    }

    // Check answer types
    maxScore++;
    const validAnswerTypes = examData.questions.every(q =>
      ['numeric', 'multiple_choice', 'algebraic', 'solution_set', 'angle_set'].includes(q.answer_type)
    );
    if (validAnswerTypes) {
      console.log('✅ Answer types: All valid');
      score++;
    } else {
      console.log('❌ Answer types: Some invalid');
    }

    // Check Finnish language
    maxScore++;
    const allFinnish = examData.questions.every(q => {
      const text = q.question_text.toLowerCase();
      return text.includes('laske') || text.includes('mikä') || text.includes('kuinka');
    });
    if (allFinnish) {
      console.log('✅ Language: All questions in Finnish');
      score++;
    } else {
      console.log('⚠️  Language: Some questions may not be Finnish');
    }

    // Check topics match textbook
    maxScore++;
    const hasSectorQuestions = examData.questions.some(q =>
      q.question_text.toLowerCase().includes('sektori') ||
      q.question_text.toLowerCase().includes('kaari')
    );
    if (hasSectorQuestions) {
      console.log('✅ Topics: Sector/arc questions present');
      score++;
    } else {
      console.log('❌ Topics: Missing sector/arc specific questions');
    }

    // Check explanations
    maxScore++;
    const allHaveExplanations = examData.questions.every(q => q.explanation && q.explanation.length > 0);
    if (allHaveExplanations) {
      console.log('✅ Explanations: Present for all questions');
      score++;
    } else {
      console.log('❌ Explanations: Missing for some questions');
    }

    console.log(`\n📊 FINAL SCORE: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);

    if (score >= 7) {
      console.log('🎉 EXCELLENT: Gemini generated high-quality exam questions');
    } else if (score >= 5) {
      console.log('✅ GOOD: Questions are usable with minor improvements needed');
    } else {
      console.log('⚠️  NEEDS WORK: Significant prompt refinement required');
    }

    console.log('\n📋 Sample questions:');
    examData.questions.slice(0, 3).forEach((q, i) => {
      console.log(`\nQ${i+1}: ${q.question_text}`);
      console.log(`   Type: ${q.answer_type}`);
      console.log(`   Difficulty: ${q.difficulty}`);
    });

    return examData;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

generateExam();
