/**
 * Math Exam Validation Script
 * Validates generated math exam JSON files for structural, quality, and mathematical correctness
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

interface MathQuestion {
  id: number;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface MathExamResponse {
  questions: MathQuestion[];
  topic?: string;
  grade?: number;
}

interface ValidationError {
  questionId: number | null;
  type: 'structural' | 'quality' | 'mathematical';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  expected?: string;
  actual?: string;
}

interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number;
  summary: string;
  breakdown: {
    structural: { passed: number; total: number };
    quality: { passed: number; total: number };
    mathematical: { passed: number; total: number };
  };
}

// ============================================================================
// Level 1: Structural Validation
// ============================================================================

function validateStructure(examData: MathExamResponse): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check question count
  if (!examData.questions || examData.questions.length !== 15) {
    errors.push({
      questionId: null,
      type: 'structural',
      severity: 'critical',
      message: `Expected 15 questions, found ${examData.questions?.length || 0}`,
      expected: '15',
      actual: String(examData.questions?.length || 0)
    });
  }

  if (!examData.questions) return errors;

  examData.questions.forEach((q, idx) => {
    // Check sequential IDs
    if (q.id !== idx + 1) {
      errors.push({
        questionId: q.id,
        type: 'structural',
        severity: 'major',
        message: `Question ID mismatch at position ${idx + 1}`,
        expected: String(idx + 1),
        actual: String(q.id)
      });
    }

    // Check required fields
    const requiredFields: (keyof MathQuestion)[] = ['id', 'type', 'question', 'options', 'correct_answer', 'explanation'];
    requiredFields.forEach(field => {
      if (!q[field] || (Array.isArray(q[field]) && q[field].length === 0)) {
        errors.push({
          questionId: q.id,
          type: 'structural',
          severity: 'critical',
          message: `Missing or empty required field: ${field}`
        });
      }
    });

    // Check options count
    if (q.options && q.options.length !== 4) {
      errors.push({
        questionId: q.id,
        type: 'structural',
        severity: 'critical',
        message: `Expected 4 options, found ${q.options.length}`,
        expected: '4',
        actual: String(q.options.length)
      });
    }

    // Check correct_answer exists in options
    if (q.options && q.correct_answer && !q.options.includes(q.correct_answer)) {
      errors.push({
        questionId: q.id,
        type: 'structural',
        severity: 'critical',
        message: `correct_answer "${q.correct_answer}" not found in options`,
        actual: q.correct_answer
      });
    }

    // Check for duplicate options
    if (q.options) {
      const uniqueOptions = new Set(q.options);
      if (uniqueOptions.size !== q.options.length) {
        const duplicates = q.options.filter((opt, idx) => q.options.indexOf(opt) !== idx);
        errors.push({
          questionId: q.id,
          type: 'structural',
          severity: 'critical',
          message: `Duplicate options found: ${duplicates.join(', ')}`,
          actual: duplicates.join(', ')
        });
      }
    }
  });

  return errors;
}

// ============================================================================
// Level 2: Quality Validation
// ============================================================================

function validateQuality(examData: MathExamResponse): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!examData.questions) return errors;

  const visualKeywords = ['kuva', 'sivu', 'kaavio', 'taulukko', 'kuvaaja', 'koordinaatisto'];
  const selfAdmittedErrorPhrases = [
    'oikea vastaus on',
    'lähin vastaus',
    'valitaan se',
    'Tehtävässä on virheellinen',
    'on virheellinen vastausvaihtoehto'
  ];
  const finnishChars = /[äöåÄÖÅ]/;

  examData.questions.forEach(q => {
    // Check for visual references
    const hasVisualRef = visualKeywords.some(kw =>
      q.question.toLowerCase().includes(kw)
    );
    if (hasVisualRef) {
      errors.push({
        questionId: q.id,
        type: 'quality',
        severity: 'major',
        message: 'Visual reference detected in question (references image/page)',
        actual: visualKeywords.find(kw => q.question.toLowerCase().includes(kw))
      });
    }

    // Check for self-admitted errors in explanations
    const hasSelfAdmittedError = selfAdmittedErrorPhrases.some(phrase =>
      q.explanation.toLowerCase().includes(phrase.toLowerCase())
    );
    if (hasSelfAdmittedError) {
      errors.push({
        questionId: q.id,
        type: 'quality',
        severity: 'critical',
        message: 'AI admitted answer is wrong in explanation',
        actual: q.explanation.substring(0, 100) + '...'
      });
    }

    // Check Finnish language
    if (!finnishChars.test(q.question) && !finnishChars.test(q.explanation)) {
      errors.push({
        questionId: q.id,
        type: 'quality',
        severity: 'minor',
        message: 'No Finnish characters detected (might be in wrong language)'
      });
    }

    // Check LaTeX balance
    const dollarSigns = (q.question + q.options.join('') + q.explanation).match(/\$/g);
    if (dollarSigns && dollarSigns.length % 2 !== 0) {
      errors.push({
        questionId: q.id,
        type: 'quality',
        severity: 'major',
        message: 'Unbalanced LaTeX delimiters ($)',
        actual: `Found ${dollarSigns.length} dollar signs (should be even)`
      });
    }
  });

  return errors;
}

// ============================================================================
// Level 3: Mathematical Validation
// ============================================================================

function extractNumber(text: string, pattern?: RegExp): number | null {
  if (pattern) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }

  // Fallback: try to find any number
  const match = text.match(/(\d+[,.]?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }

  return null;
}

function parseAnswer(answer: string): number | null {
  // Remove LaTeX and extract number
  const cleaned = answer.replace(/\$/g, '').replace(/[\\{}]/g, '');

  // Try to extract fraction
  const fractionMatch = cleaned.match(/frac\s*(\d+)\s*(\d+)/);
  if (fractionMatch) {
    return parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
  }

  // Try to extract regular number
  const numberMatch = cleaned.match(/(\d+[,.]?\d*)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1].replace(',', '.'));
  }

  return null;
}

function validateGeometry(questions: MathQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];

  questions.forEach(q => {
    // Validate sector area: (angle/360) × π × r²
    if (q.question.toLowerCase().includes('sektorin pinta-ala')) {
      const radiusMatch = q.question.match(/säde\s*(?:on)?\s*(\d+[,.]?\d*)/i);
      const angleMatch = q.question.match(/(?:keskuskulma|kulma)\s*(?:on)?\s*(\d+)°/i);

      if (radiusMatch && angleMatch) {
        const radius = parseFloat(radiusMatch[1].replace(',', '.'));
        const angle = parseFloat(angleMatch[1]);
        const expected = (angle / 360) * Math.PI * radius * radius;
        const actual = parseAnswer(q.correct_answer);

        if (actual !== null && Math.abs(expected - actual) > 1.0) {
          errors.push({
            questionId: q.id,
            type: 'mathematical',
            severity: 'critical',
            message: `Sector area calculation error`,
            expected: `≈${expected.toFixed(1)} (formula: ${angle}/360 × π × ${radius}²)`,
            actual: `${actual.toFixed(1)}`
          });
        }
      }
    }

    // Validate arc length: (angle/360) × 2π × r
    if (q.question.toLowerCase().includes('kaaren pituus')) {
      const radiusMatch = q.question.match(/säde\s*(?:on)?\s*(\d+[,.]?\d*)/i);
      const angleMatch = q.question.match(/(?:keskuskulma|kulma)\s*(?:on)?\s*(\d+)°/i);

      if (radiusMatch && angleMatch) {
        const radius = parseFloat(radiusMatch[1].replace(',', '.'));
        const angle = parseFloat(angleMatch[1]);
        const expected = (angle / 360) * 2 * Math.PI * radius;
        const actual = parseAnswer(q.correct_answer);

        if (actual !== null && Math.abs(expected - actual) > 0.5) {
          errors.push({
            questionId: q.id,
            type: 'mathematical',
            severity: 'critical',
            message: `Arc length calculation error`,
            expected: `≈${expected.toFixed(1)} (formula: ${angle}/360 × 2π × ${radius})`,
            actual: `${actual.toFixed(1)}`
          });
        }
      }
    }
  });

  return errors;
}

function validateExponents(questions: MathQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];

  questions.forEach(q => {
    // Validate basic power calculations like 10^1, 10^-1, etc.
    const powerMatch = q.question.match(/Laske\s+\$([^$]+)\$/);
    if (powerMatch) {
      const expr = powerMatch[1];

      // Simple cases: 10^n
      const simplePowerMatch = expr.match(/(\d+)\^\{?(-?\d+)\}?/);
      if (simplePowerMatch) {
        const base = parseFloat(simplePowerMatch[1]);
        const exponent = parseFloat(simplePowerMatch[2]);
        const expected = Math.pow(base, exponent);
        const actual = parseAnswer(q.correct_answer);

        if (actual !== null && Math.abs(expected - actual) > 0.01) {
          errors.push({
            questionId: q.id,
            type: 'mathematical',
            severity: 'critical',
            message: `Power calculation error`,
            expected: `${expected}`,
            actual: `${actual}`
          });
        }
      }

      // Negative base: (-n)^0
      const negPowerMatch = expr.match(/\((-?\d+)\)\^\{?(\d+)\}?/);
      if (negPowerMatch) {
        const base = parseFloat(negPowerMatch[1]);
        const exponent = parseFloat(negPowerMatch[2]);

        // (-n)^0 should always be 1
        if (exponent === 0) {
          const actual = parseAnswer(q.correct_answer);
          if (actual !== 1) {
            errors.push({
              questionId: q.id,
              type: 'mathematical',
              severity: 'critical',
              message: `Any number to power 0 should be 1`,
              expected: `1`,
              actual: `${actual}`
            });
          }
        }
      }
    }
  });

  return errors;
}

function validateCombinatorics(questions: MathQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Helper functions
  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  };

  const permutation = (n: number, r: number): number => {
    return factorial(n) / factorial(n - r);
  };

  const combination = (n: number, r: number): number => {
    return factorial(n) / (factorial(r) * factorial(n - r));
  };

  questions.forEach(q => {
    // Detect multiplication principle: "X vaihtoehtoa... Y vaihtoehtoa"
    const multMatches = [...q.question.matchAll(/(\d+)\s+(?:erilaista|vaihtoehtoa)/g)];
    if (multMatches.length >= 2 && q.question.toLowerCase().includes('kuinka monta')) {
      const numbers = multMatches.map(m => parseInt(m[1]));
      const expected = numbers.reduce((a, b) => a * b, 1);
      const actual = parseAnswer(q.correct_answer);

      if (actual !== null && expected !== actual) {
        errors.push({
          questionId: q.id,
          type: 'mathematical',
          severity: 'critical',
          message: `Multiplication principle error`,
          expected: `${expected} (${numbers.join(' × ')})`,
          actual: `${actual}`
        });
      }
    }

    // Detect permutations: "n! = n × (n-1) × ..."
    if (q.explanation.includes('!')) {
      const factMatch = q.explanation.match(/(\d+)!/);
      if (factMatch) {
        const n = parseInt(factMatch[1]);
        const expected = factorial(n);
        const actual = parseAnswer(q.correct_answer);

        if (actual !== null && expected !== actual) {
          errors.push({
            questionId: q.id,
            type: 'mathematical',
            severity: 'critical',
            message: `Factorial calculation error`,
            expected: `${expected} (${n}!)`,
            actual: `${actual}`
          });
        }
      }
    }
  });

  return errors;
}

function validateEquations(questions: MathQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];

  questions.forEach(q => {
    // Detect simple proportion problems
    if (q.question.toLowerCase().includes('kuinka kauan') ||
        q.question.toLowerCase().includes('kuinka paljon')) {

      // Extract numbers from word problems
      const numbers = [...q.question.matchAll(/(\d+[,.]?\d*)/g)].map(m =>
        parseFloat(m[1].replace(',', '.'))
      );

      // Basic validation: answer should be reasonable
      const actual = parseAnswer(q.correct_answer);
      if (actual !== null) {
        // Check if answer is unreasonably large or small
        if (actual < 0 || actual > 1000000) {
          errors.push({
            questionId: q.id,
            type: 'mathematical',
            severity: 'major',
            message: `Answer seems unreasonable`,
            actual: `${actual}`
          });
        }
      }
    }
  });

  return errors;
}

function detectTopic(topicString?: string): string {
  if (!topicString) return 'unknown';

  const topic = topicString.toLowerCase();

  if (topic.includes('potens') || topic.includes('eksponent')) return 'exponents';
  if (topic.includes('geomet') || topic.includes('ympyrä') || topic.includes('sektori')) return 'geometry';
  if (topic.includes('kombinat') || topic.includes('todennäköis')) return 'combinatorics';
  if (topic.includes('yhtälö') || topic.includes('mittakaava') || topic.includes('suhte')) return 'equations';

  return 'unknown';
}

function validateMathematics(examData: MathExamResponse): ValidationError[] {
  if (!examData.questions) return [];

  const topic = detectTopic(examData.topic);
  let errors: ValidationError[] = [];

  switch (topic) {
    case 'geometry':
      errors = validateGeometry(examData.questions);
      break;
    case 'exponents':
      errors = validateExponents(examData.questions);
      break;
    case 'combinatorics':
      errors = validateCombinatorics(examData.questions);
      break;
    case 'equations':
      errors = validateEquations(examData.questions);
      break;
    default:
      // Unknown topic, skip mathematical validation
      break;
  }

  return errors;
}

// ============================================================================
// Main Validation Function
// ============================================================================

function validateExam(examData: MathExamResponse): ValidationResult {
  const structuralErrors = validateStructure(examData);
  const qualityErrors = validateQuality(examData);
  const mathematicalErrors = validateMathematics(examData);

  const allErrors = [...structuralErrors, ...qualityErrors, ...mathematicalErrors];
  const criticalErrors = allErrors.filter(e => e.severity === 'critical');
  const majorErrors = allErrors.filter(e => e.severity === 'major');
  const minorErrors = allErrors.filter(e => e.severity === 'minor');

  // Calculate score (100 = perfect)
  const criticalPenalty = criticalErrors.length * 10;
  const majorPenalty = majorErrors.length * 5;
  const minorPenalty = minorErrors.length * 2;
  const score = Math.max(0, 100 - criticalPenalty - majorPenalty - minorPenalty);

  // Calculate breakdown
  const structuralTotal = examData.questions ? examData.questions.length * 5 : 0; // 5 checks per question
  const structuralPassed = structuralTotal - structuralErrors.length;

  const qualityTotal = examData.questions ? examData.questions.length * 3 : 0; // 3 checks per question
  const qualityPassed = qualityTotal - qualityErrors.length;

  const mathTotal = examData.questions ? examData.questions.length : 0;
  const mathPassed = mathTotal - mathematicalErrors.length;

  return {
    passed: criticalErrors.length === 0 && score >= 80,
    errors: allErrors,
    warnings: minorErrors,
    score,
    summary: generateSummary(allErrors, score),
    breakdown: {
      structural: { passed: Math.max(0, structuralPassed), total: structuralTotal },
      quality: { passed: Math.max(0, qualityPassed), total: qualityTotal },
      mathematical: { passed: Math.max(0, mathPassed), total: mathTotal }
    }
  };
}

function generateSummary(errors: ValidationError[], score: number): string {
  const critical = errors.filter(e => e.severity === 'critical').length;
  const major = errors.filter(e => e.severity === 'major').length;
  const minor = errors.filter(e => e.severity === 'minor').length;

  if (errors.length === 0) {
    return '✅ Perfect exam - all validations passed';
  }

  if (critical > 0) {
    return `❌ FAILED - ${critical} critical error(s), ${major} major, ${minor} minor`;
  }

  if (score >= 80) {
    return `✅ PASSED - ${major} major warning(s), ${minor} minor`;
  }

  return `⚠️  MARGINAL - Score ${score}/100, ${major} major, ${minor} minor`;
}

// ============================================================================
// Report Generation
// ============================================================================

function printValidationReport(result: ValidationResult, filename: string, examData: MathExamResponse) {
  console.log('\n' + '═'.repeat(80));
  console.log(`📋 VALIDATION REPORT: ${filename}`);
  console.log('═'.repeat(80));

  console.log(`\n📚 Topic: ${examData.topic || 'Unknown'}`);
  console.log(`📊 Questions: ${examData.questions?.length || 0}`);
  console.log(`🎯 Overall Score: ${result.score}/100`);
  console.log(`📈 Result: ${result.summary}\n`);

  // Breakdown
  console.log('─'.repeat(80));
  console.log('VALIDATION BREAKDOWN:');
  console.log('─'.repeat(80));

  const structIcon = result.breakdown.structural.passed === result.breakdown.structural.total ? '✅' : '❌';
  const qualIcon = result.breakdown.quality.passed === result.breakdown.quality.total ? '✅' : '⚠️';
  const mathIcon = result.breakdown.mathematical.passed === result.breakdown.mathematical.total ? '✅' : '❌';

  console.log(`${structIcon} Structural: ${result.breakdown.structural.passed}/${result.breakdown.structural.total} checks passed`);
  console.log(`${qualIcon} Quality: ${result.breakdown.quality.passed}/${result.breakdown.quality.total} checks passed`);
  console.log(`${mathIcon} Mathematical: ${result.breakdown.mathematical.passed}/${result.breakdown.mathematical.total} questions correct\n`);

  // Errors by severity
  const critical = result.errors.filter(e => e.severity === 'critical');
  const major = result.errors.filter(e => e.severity === 'major');
  const minor = result.errors.filter(e => e.severity === 'minor');

  if (critical.length > 0) {
    console.log('─'.repeat(80));
    console.log(`❌ CRITICAL ERRORS (${critical.length}):`);
    console.log('─'.repeat(80));
    critical.forEach(err => {
      console.log(`\n  Q${err.questionId || 'General'}: ${err.message}`);
      if (err.expected) console.log(`    Expected: ${err.expected}`);
      if (err.actual) console.log(`    Actual: ${err.actual}`);
    });
  }

  if (major.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`⚠️  MAJOR ISSUES (${major.length}):`);
    console.log('─'.repeat(80));
    major.forEach(err => {
      console.log(`\n  Q${err.questionId || 'General'}: ${err.message}`);
      if (err.actual) console.log(`    Details: ${err.actual}`);
    });
  }

  if (minor.length > 0 && minor.length <= 5) {
    console.log('\n' + '─'.repeat(80));
    console.log(`ℹ️  MINOR WARNINGS (${minor.length}):`);
    console.log('─'.repeat(80));
    minor.forEach(err => {
      console.log(`  Q${err.questionId || 'General'}: ${err.message}`);
    });
  } else if (minor.length > 5) {
    console.log(`\nℹ️  ${minor.length} minor warnings (not shown)`);
  }

  // Recommendation
  console.log('\n' + '═'.repeat(80));
  if (result.passed) {
    console.log('✅ RECOMMENDATION: Exam is acceptable for use');
  } else if (critical.length > 0) {
    console.log('❌ RECOMMENDATION: Regenerate exam - critical errors found');
  } else {
    console.log('⚠️  RECOMMENDATION: Review issues and decide if acceptable');
  }
  console.log('═'.repeat(80) + '\n');
}

// ============================================================================
// CLI Interface
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Math Exam Validator
═══════════════════

Usage:
  npx tsx validate-math-exams.ts <filename>        Validate single exam
  npx tsx validate-math-exams.ts --all             Validate all exams

Examples:
  npx tsx validate-math-exams.ts math-exam-output-geometry-optimized.json
  npx tsx validate-math-exams.ts --all
    `);
    process.exit(0);
  }

  let files: string[] = [];

  if (args.includes('--all')) {
    // Find all math-exam-output-*.json files
    const allFiles = fs.readdirSync(__dirname);
    files = allFiles.filter(f =>
      f.startsWith('math-exam-output-') &&
      f.endsWith('.json') &&
      !f.includes('old') &&
      !f.includes('backup')
    );
  } else {
    files = args;
  }

  if (files.length === 0) {
    console.error('❌ No exam files found');
    process.exit(1);
  }

  let totalScore = 0;
  let totalPassed = 0;

  files.forEach((file, idx) => {
    const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }

    try {
      const examData: MathExamResponse = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const result = validateExam(examData);

      printValidationReport(result, path.basename(file), examData);

      totalScore += result.score;
      if (result.passed) totalPassed++;

    } catch (error) {
      console.error(`❌ Error validating ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Summary if multiple files
  if (files.length > 1) {
    console.log('\n' + '═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Files validated: ${files.length}`);
    console.log(`Passed: ${totalPassed}/${files.length}`);
    console.log(`Average score: ${(totalScore / files.length).toFixed(1)}/100`);
    console.log('═'.repeat(80) + '\n');
  }
}

main();
