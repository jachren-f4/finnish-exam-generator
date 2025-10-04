const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const API_KEY = 'REMOVED_API_KEY';

// NEW PROMPT - Dynamic difficulty analysis with topic auto-detection
const prompt = `ROLE: You are an expert mathematics teacher creating exam questions for students studying from their textbook.

CONTEXT: You are analyzing textbook images containing mathematical content. The images may show:
- Worked examples with solutions
- Formula definitions and explanations
- Practice problems
- Diagrams and geometric figures
- Real-world applications

CRITICAL - CONTENT DIFFICULTY ANALYSIS:
Before generating questions, analyze the ACTUAL difficulty level of the material shown in the images:

Step 1: IDENTIFY SPECIFIC CONCEPTS
- Look at the formulas shown (e.g., "circle sector area: A = (α/360°) × π × r²")
- Look at the notation used (basic numbers, fractions, Greek letters like α, π, θ)
- Look at the examples solved (simple substitution vs. multi-step derivation)

Step 2: ASSESS COMPLEXITY LEVEL
- Basic: Simple arithmetic, whole numbers, one-step problems
- Intermediate: Fractions, decimals, basic formulas, two-step problems
- Advanced: Multiple formulas, symbolic manipulation, Greek letters, multi-step derivation

Step 3: DETECT MATHEMATICAL TOPICS
- Identify 1-3 main mathematical topics shown in the images
- Be specific: "circle sector area calculations with π" not just "geometry"
- Examples of topics: circle_sectors, pythagorean_theorem, linear_equations, quadratic_formula, trigonometry, probability, etc.

Step 4: MATCH DIFFICULTY EXACTLY
- If images show π and formulas → Generate questions with π and formulas
- If images show only basic arithmetic → Generate only basic arithmetic questions
- DO NOT assume difficulty based on grade level, age, or country
- DO NOT make questions simpler or harder than the material shown

TASK: Generate 8-15 exam questions that MATCH THE EXACT DIFFICULTY LEVEL of the content shown in these textbook images.

IMPORTANT REQUIREMENTS:
1. Questions MUST be in Finnish language
2. Difficulty MUST MATCH the actual complexity shown in images (analyze first!)
3. Cover different aspects of the specific topics detected
4. Mix of question types: 60% numeric calculations, 30% word problems, 10% multiple choice
5. No references to "kuva" or "kuvassa" - create standalone questions that make sense without the images
6. All mathematical expressions MUST use valid LaTeX syntax
7. Use the SAME formulas, notation, and problem-solving approach shown in the images

MATHEMATICAL NOTATION (LaTeX Requirements):
- All math expressions MUST be in LaTeX format
- Use proper LaTeX syntax: \\\\frac{\\\\alpha}{360°}, \\\\pi, r^2, \\\\theta
- Put inline LaTeX directly in question_text: "kun säde on $r = 5.3$ cm"
- Use question_latex ONLY for displaying formulas separately: "Kaava: $A = \\\\frac{\\\\alpha}{360°} \\\\times \\\\pi r^2$"
- Do NOT duplicate the entire question text in question_latex
- Ensure LaTeX is valid and renderable with KaTeX
- Remember: In JSON, backslashes must be escaped (\\\\alpha not \\alpha)

ANSWER TYPES - Choose appropriate type based on question:
1. "numeric" - Decimal or integer with tolerance (e.g., 12.9 cm²)
2. "algebraic" - Symbolic expression (e.g., 2x + 3)
3. "solution_set" - Set notation (e.g., {1, 2, 3} or {x | x > 5})
4. "multiple_choice" - Four options A, B, C, D
5. "angle_set" - Angle measurements (e.g., {45°, 135°})
6. "ordered_pair" - Coordinate pair (e.g., (3, 4))
7. "inequality" - Inequality expression (e.g., x < 5)
8. "ratio_proportion" - Ratio notation (e.g., 2:3)
9. "unit_conversion" - Unit conversion (e.g., 5 km = 5000 m)

OUTPUT FORMAT - You MUST respond with valid JSON:

{
  "exam_metadata": {
    "topic": "Detected topic in Finnish (e.g., 'Ympyräsektorit ja kaaret')",
    "detected_concepts": ["circle_sectors", "arc_length", "central_angles"],
    "difficulty": "basic | intermediate | advanced (based on image analysis)",
    "estimated_time_minutes": 30
  },
  "questions": [
    {
      "question_id": "q_001",
      "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm ja keskuskulma on $\\\\alpha = 56°$.",
      "question_latex": "Kaava: $A = \\\\frac{\\\\alpha}{360°} \\\\times \\\\pi r^2$",
      "question_display_mode": "block",

      "answer_type": "numeric",
      "answer_format": {
        "type": "decimal",
        "tolerance": 0.5,
        "units": "cm²",
        "decimals": 1
      },

      "correct_answer": {
        "value": 12.9,
        "display": "12.9 cm²"
      },

      "grading_rules": {
        "match_type": "numeric_tolerance",
        "tolerance": 0.5
      },

      "explanation": "Sektorin pinta-ala lasketaan kaavalla $A = \\\\frac{\\\\alpha}{360°} \\\\times \\\\pi r^2$. Sijoita arvot: $A = \\\\frac{56°}{360°} \\\\times \\\\pi (5.3)^2 \\\\approx 12.9$ cm².",
      "explanation_latex": "$A = \\\\\\\\frac{56°}{360°} \\\\\\\\times \\\\\\\\pi (5.3)^2 \\\\\\\\approx 12.9$ cm²",

      "difficulty": "intermediate",
      "curriculum_topic": "circle_sectors",
      "estimated_time_seconds": 180
    }
  ]
}

VALIDATION RULES - Every question MUST follow these rules:
1. Every question MUST have a valid answer_type from the 9 types listed above
2. Numeric answers MUST include tolerance, units, and decimals in answer_format
3. All LaTeX MUST be valid KaTeX syntax (escape backslashes properly in JSON: \\\\alpha not \\alpha)
4. Multiple choice questions MUST have exactly 4 options (A, B, C, D)
5. Solutions MUST be mathematically correct - verify by solving
6. Explanations MUST be clear and educational in Finnish
7. For multiple choice: do NOT use lettered sub-parts (a, b, c) in question text
8. The detected_concepts array MUST contain 1-3 specific topic identifiers

QUALITY CHECKLIST - Verify before responding:
☐ Questions match the difficulty level shown in images (not too easy, not too hard)
☐ detected_concepts accurately reflects the topics shown in the images
☐ difficulty field matches the actual complexity (basic/intermediate/advanced)
☐ Mix of question types (numeric, word problems, multiple choice)
☐ All LaTeX notation is correct and properly escaped for JSON
☐ Answers are mathematically verified by solving the problems
☐ No references to "kuvassa" or "the image" in question text
☐ All questions are standalone and make sense without seeing the images

SELF-VALIDATION BEFORE RESPONDING:
1. Analyze the images first - what formulas are shown? What notation is used?
2. Set difficulty based on what you see, not assumptions about grade level
3. Solve each question yourself to verify the correct answer
4. Check that LaTeX syntax is valid (no unescaped backslashes in JSON)
5. Ensure detected_concepts match the actual content shown

Generate 8-15 questions now in valid JSON format.`;

async function generateExam() {
  try {
    console.log('🚀 Testing NEW Math Prompt with Topic Auto-Detection\n');
    console.log('📊 Prompt Strategy: Dynamic difficulty analysis (no grade assumptions)');
    console.log('🎯 Expected: LLM detects topics and difficulty from image content\n');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Read image (same circle geometry page)
    const imagePath = path.join(__dirname, 'assets/images/math8thgrade/IMG_6248.JPG');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('📸 Image loaded:', imagePath);
    console.log('📝 Sending NEW prompt to Gemini 2.5 Flash-Lite...\n');

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

    // Save raw response
    const rawResponsePath = path.join(__dirname, 'math_prompt_v2_raw_response.txt');
    fs.writeFileSync(rawResponsePath, responseText);
    console.log('💾 Raw response saved to:', rawResponsePath);

    // Parse JSON
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }

    // Save cleaned JSON
    const cleanedJsonPath = path.join(__dirname, 'math_prompt_v2_cleaned_json.txt');
    fs.writeFileSync(cleanedJsonPath, jsonText);
    console.log('💾 Cleaned JSON saved to:', cleanedJsonPath);

    let examData;
    try {
      examData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.log('\n🔧 Attempting to fix LaTeX escape sequences...');

      // Fix backslash escaping
      let fixedJson = jsonText.replace(/\\/g, '\\\\');

      try {
        examData = JSON.parse(fixedJson);
        console.log('✅ Fixed! JSON parsed after LaTeX escape correction\n');
      } catch (secondError) {
        console.error('❌ Still failed after attempted fix');
        console.error('Second error:', secondError.message);

        const fixedJsonPath = path.join(__dirname, 'math_prompt_v2_fixed_attempt.txt');
        fs.writeFileSync(fixedJsonPath, fixedJson);
        console.error('💾 Attempted fix saved to:', fixedJsonPath);

        throw parseError;
      }
    }

    console.log('✅ JSON parsed successfully');
    console.log('📊 Exam metadata:', JSON.stringify(examData.exam_metadata, null, 2));
    console.log('📝 Questions generated:', examData.questions.length);
    console.log('');

    // Save parsed exam
    const outputPath = path.join(__dirname, 'math_prompt_v2_exam.json');
    fs.writeFileSync(outputPath, JSON.stringify(examData, null, 2));
    console.log('💾 Saved to:', outputPath);

    // NEW: Validate topic detection
    console.log('\n🔍 TOPIC DETECTION VALIDATION:\n');

    const metadata = examData.exam_metadata;
    console.log('✅ Topic (Finnish):', metadata.topic || '❌ MISSING');
    console.log('✅ Detected Concepts:', JSON.stringify(metadata.detected_concepts || []));
    console.log('✅ Difficulty:', metadata.difficulty || '❌ MISSING');
    console.log('');

    // Quality assessment
    console.log('\n🔍 QUALITY ASSESSMENT:\n');

    let score = 0;
    let maxScore = 0;

    // Check question count
    maxScore++;
    if (examData.questions.length >= 8 && examData.questions.length <= 15) {
      console.log(`✅ Question count: ${examData.questions.length}/8-15 correct`);
      score++;
    } else {
      console.log(`❌ Question count: ${examData.questions.length} (expected 8-15)`);
    }

    // Check topic detection
    maxScore++;
    if (metadata.detected_concepts && Array.isArray(metadata.detected_concepts) && metadata.detected_concepts.length > 0) {
      console.log('✅ Topic detection: detected_concepts present');
      console.log(`   Topics: ${metadata.detected_concepts.join(', ')}`);
      score++;
    } else {
      console.log('❌ Topic detection: Missing detected_concepts');
    }

    // Check difficulty field
    maxScore++;
    if (metadata.difficulty && ['basic', 'intermediate', 'advanced'].includes(metadata.difficulty)) {
      console.log(`✅ Difficulty assessment: ${metadata.difficulty}`);
      score++;
    } else {
      console.log('❌ Difficulty assessment: Invalid or missing');
    }

    // Check advanced topics (π calculations)
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
      ['numeric', 'multiple_choice', 'algebraic', 'solution_set', 'angle_set', 'ordered_pair', 'inequality', 'ratio_proportion', 'unit_conversion'].includes(q.answer_type)
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

    console.log(`\n📊 FINAL SCORE: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);

    if (score >= 7) {
      console.log('🎉 EXCELLENT: New prompt generates high-quality exams with topic detection');
    } else if (score >= 5) {
      console.log('✅ GOOD: Questions are usable with minor improvements needed');
    } else {
      console.log('⚠️  NEEDS WORK: Significant prompt refinement required');
    }

    // Sample questions
    console.log('\n📋 Sample questions:');
    examData.questions.slice(0, 3).forEach((q, i) => {
      console.log(`\nQ${i+1}: ${q.question_text}`);
      console.log(`   Answer Type: ${q.answer_type}`);
      console.log(`   Topic: ${q.curriculum_topic || 'N/A'}`);
      console.log(`   Difficulty: ${q.difficulty}`);
    });

    // Generate HTML demo
    console.log('\n\n🌐 Generating HTML demo...');
    generateHTML(examData);

    return examData;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function generateHTML(examData) {
  const html = `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${examData.exam_metadata.topic} - Math Exam v2</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .exam-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        .metadata-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 5px 15px;
            border-radius: 20px;
            margin: 5px;
            font-size: 14px;
        }
        .question {
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .question-number {
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .difficulty-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            text-transform: uppercase;
        }
        .difficulty-basic { background: #d4edda; color: #155724; }
        .difficulty-intermediate { background: #fff3cd; color: #856404; }
        .difficulty-advanced { background: #f8d7da; color: #721c24; }
        .formula-box {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin: 15px 0;
            font-size: 18px;
        }
        .answer-format {
            background: #e7f3ff;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 14px;
        }
        .topic-detection {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="exam-header">
        <h1>${examData.exam_metadata.topic}</h1>
        <div>
            <span class="metadata-badge">Vaikeustaso: ${examData.exam_metadata.difficulty}</span>
            <span class="metadata-badge">Aika: ${examData.exam_metadata.estimated_time_minutes} min</span>
            <span class="metadata-badge">Kysymyksiä: ${examData.questions.length}</span>
        </div>
    </div>

    <div class="topic-detection">
        <h3>🎯 LLM-Tunnistetut Aiheet (Topic Auto-Detection)</h3>
        <p><strong>Detected Concepts:</strong> ${examData.exam_metadata.detected_concepts.join(', ')}</p>
        <p><em>Gemini analyzed the textbook images and automatically detected these topics without any grade-level assumptions.</em></p>
    </div>

    ${examData.questions.map((q, i) => `
    <div class="question">
        <div class="question-header">
            <span class="question-number">Kysymys ${i + 1}/${examData.questions.length}</span>
            <span class="difficulty-badge difficulty-${q.difficulty}">${q.difficulty}</span>
        </div>

        <p class="question-text">${q.question_text}</p>

        ${q.question_latex ? `<div class="formula-box">${q.question_latex}</div>` : ''}

        <div class="answer-format">
            <strong>Vastaustyyppi:</strong> ${q.answer_type}<br>
            ${q.answer_format ? `<strong>Muoto:</strong> ${JSON.stringify(q.answer_format)}<br>` : ''}
            <strong>Aihe:</strong> ${q.curriculum_topic}
        </div>
    </div>
    `).join('')}

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ],
                throwOnError: false
            });
        });
    </script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, `math_exam_v2_${Date.now()}.html`);
  fs.writeFileSync(htmlPath, html);
  console.log('✅ HTML demo generated:', htmlPath);
  console.log('\n🌐 Open the HTML file in your browser to see the exam with LaTeX rendering!\n');
}

generateExam();
