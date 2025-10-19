// Simple script to analyze the latest exam for quality issues
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLatestExam() {
  // Get the most recent exam
  const { data: exams, error } = await supabase
    .from('examgenie_exams')
    .select('*, examgenie_questions(*)')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !exams || exams.length === 0) {
    console.error('Error fetching exam:', error);
    return;
  }

  const exam = exams[0];
  const questions = exam.examgenie_questions || [];

  console.log('\n========================================');
  console.log('EXAM QUALITY ANALYSIS');
  console.log('========================================\n');
  console.log(`Exam ID: ${exam.id}`);
  console.log(`Created: ${exam.created_at}`);
  console.log(`Questions: ${questions.length}`);
  console.log('');

  // Quality checks
  const issues = [];
  const metrics = {
    languageAccuracy: 0,
    answerFormat: 0,
    answerLeakage: 0,
    textViolations: 0,
    grammar: 0
  };

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    const qText = q.question_text || '';
    const correctAnswer = q.correct_answer || '';
    const options = q.options || [];

    console.log(`\nQ${qNum}: ${qText.substring(0, 80)}${qText.length > 80 ? '...' : ''}`);
    console.log(`   Options: ${JSON.stringify(options)}`);
    console.log(`   Answer: ${correctAnswer}`);

    // 1. Language check (Finnish source should have Finnish questions)
    const hasFinnishChars = /[äöåÄÖÅ]/.test(qText);
    if (hasFinnishChars) {
      console.log(`   ✅ Language: Finnish detected`);
      metrics.languageAccuracy++;
    } else {
      console.log(`   ❌ Language: No Finnish characters - possible English`);
      issues.push(`Q${qNum}: Language mismatch - expected Finnish`);
    }

    // 2. Answer format check
    const isLetter = /^[A-D]$/i.test(correctAnswer.trim());
    if (isLetter) {
      console.log(`   ❌ Format: Letter answer "${correctAnswer}" (breaks shuffling)`);
      issues.push(`Q${qNum}: Using letter format instead of text`);
    } else if (!options.includes(correctAnswer)) {
      console.log(`   ❌ Format: Answer not in options`);
      issues.push(`Q${qNum}: correct_answer not found in options`);
    } else {
      console.log(`   ✅ Format: Text answer matches options`);
      metrics.answerFormat++;
    }

    // 3. Answer leakage check
    const leakagePatterns = [/koska|sillä|joten|because|since/i];
    const hasLeakage = leakagePatterns.some(p => p.test(qText));
    if (hasLeakage) {
      console.log(`   ⚠️  Leakage: Contains explanatory clause`);
      issues.push(`Q${qNum}: Potential answer leakage`);
    } else {
      metrics.answerLeakage++;
    }

    // 4. Text-based violations
    const violations = [/kuva|diagram|picture|image|sivu|page \d+/i];
    const hasViolation = violations.some(p => p.test(qText));
    if (hasViolation) {
      console.log(`   ❌ Violation: References visual/page elements`);
      issues.push(`Q${qNum}: Text-based exam violation`);
    } else {
      metrics.textViolations++;
    }
  });

  // Summary
  console.log('\n========================================');
  console.log('QUALITY METRICS SUMMARY');
  console.log('========================================\n');
  console.log(`Language Accuracy:    ${metrics.languageAccuracy}/${questions.length} (${Math.round(metrics.languageAccuracy/questions.length*100)}%)`);
  console.log(`Answer Format:        ${metrics.answerFormat}/${questions.length} (${Math.round(metrics.answerFormat/questions.length*100)}%)`);
  console.log(`No Answer Leakage:    ${metrics.answerLeakage}/${questions.length} (${Math.round(metrics.answerLeakage/questions.length*100)}%)`);
  console.log(`No Text Violations:   ${metrics.textViolations}/${questions.length} (${Math.round(metrics.textViolations/questions.length*100)}%)`);

  console.log(`\nTotal Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('\nIssues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Save analysis
  const analysis = {
    examId: exam.id,
    timestamp: new Date().toISOString(),
    metrics,
    issues,
    questions: questions.map(q => ({
      id: q.id,
      text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer
    }))
  };

  const filename = `prompttests/analysis-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(analysis, null, 2));
  console.log(`\nAnalysis saved to: ${filename}`);
}

analyzeLatestExam().catch(console.error);
