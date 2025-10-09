/**
 * Test Gemini OCR quality with different image compression levels
 * Compares text extraction accuracy between high-res and mid-res images
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Simple OCR extraction prompt
const OCR_PROMPT = `Extract ALL text from this image exactly as it appears.

Instructions:
- Preserve original spelling, punctuation, and formatting
- Include ALL text: titles, headers, body text, captions, labels
- Maintain paragraph structure
- Do NOT translate or modify the text

Return the extracted text in plain text format (not JSON).`;

interface OCRTestResult {
  imagePath: string;
  imageSize: number;
  resolution: string;
  processingTime: number;
  extractedText: string;
  textLength: number;
  wordCount: number;
  hasSpecialChars: boolean;
  finnishChars: string[];
}

async function extractTextFromImage(imagePath: string): Promise<OCRTestResult> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: TEMPERATURE
    }
  });

  // Load image
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const imageSize = imageBuffer.length;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg'
    }
  };

  console.log(`📸 Processing: ${path.basename(imagePath)}`);
  console.log(`   Size: ${(imageSize / 1024).toFixed(2)} KB`);

  const startTime = Date.now();

  try {
    const result = await model.generateContent([OCR_PROMPT, imagePart]);
    const response = result.response;
    const text = response.text();

    const processingTime = Date.now() - startTime;

    // Analyze extracted text
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const finnishChars = [...new Set(text.match(/[äöåÄÖÅ]/g) || [])];
    const hasSpecialChars = finnishChars.length > 0;

    console.log(`   ✅ Completed in ${processingTime}ms`);
    console.log(`   Text length: ${text.length} chars`);
    console.log(`   Word count: ${words.length}`);
    console.log(`   Finnish chars: ${finnishChars.join(', ') || 'none'}`);

    return {
      imagePath,
      imageSize,
      resolution: path.basename(imagePath).includes('hires') ? 'high' : 'medium',
      processingTime,
      extractedText: text,
      textLength: text.length,
      wordCount: words.length,
      hasSpecialChars,
      finnishChars
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    throw error;
  }
}

function compareTexts(text1: string, text2: string): void {
  console.log('\n📊 Text Comparison:');
  console.log('─'.repeat(80));

  // Character-level similarity
  const longer = text1.length > text2.length ? text1 : text2;
  const shorter = text1.length > text2.length ? text2 : text1;

  // Levenshtein distance (simplified - just count matching chars)
  let matches = 0;
  const minLength = Math.min(text1.length, text2.length);
  for (let i = 0; i < minLength; i++) {
    if (text1[i] === text2[i]) matches++;
  }

  const similarity = (matches / longer.length) * 100;
  console.log(`Character-level similarity: ${similarity.toFixed(2)}%`);

  // Word-level comparison
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));

  const commonWords = [...words1].filter(w => words2.has(w));
  const allWords = new Set([...words1, ...words2]);

  const wordSimilarity = (commonWords.length / allWords.size) * 100;
  console.log(`Word-level similarity: ${wordSimilarity.toFixed(2)}%`);
  console.log(`Common words: ${commonWords.length}/${allWords.size}`);

  // Check for Finnish character preservation
  const finnishChars1 = [...new Set(text1.match(/[äöåÄÖÅ]/g) || [])];
  const finnishChars2 = [...new Set(text2.match(/[äöåÄÖÅ]/g) || [])];

  console.log(`\nFinnish character preservation:`);
  console.log(`   High-res: ${finnishChars1.join(', ') || 'none'}`);
  console.log(`   Mid-res:  ${finnishChars2.join(', ') || 'none'}`);

  const charsMatch = JSON.stringify(finnishChars1.sort()) === JSON.stringify(finnishChars2.sort());
  console.log(`   Match: ${charsMatch ? '✅ Yes' : '❌ No'}`);
}

async function testOCRQuality() {
  console.log('🔬 Testing OCR Quality: High-res vs. Mid-res\n');

  // Test with the same page in different resolutions
  const imagePairs = [
    {
      hires: '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl15a 1500 comp.jpeg',
      midres: '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl15a 1150 comp.jpeg',
      name: 'kpl15a'
    }
  ];

  for (const pair of imagePairs) {
    console.log('═'.repeat(80));
    console.log(`Testing image pair: ${pair.name}`);
    console.log('═'.repeat(80));
    console.log('');

    // Extract from high-res
    console.log('🔍 UNCOMPRESSED IMAGE:\n');
    const hiresResult = await extractTextFromImage(pair.hires);

    console.log('\n' + '─'.repeat(80) + '\n');

    // Extract from mid-res
    console.log('🔍 COMPRESSED IMAGE:\n');
    const midresResult = await extractTextFromImage(pair.midres);

    // Compare results
    compareTexts(hiresResult.extractedText, midresResult.extractedText);

    // Save results
    const outputDir = path.join(__dirname, 'ocr-comparison-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, `${pair.name}_uncompressed_text.txt`),
      hiresResult.extractedText
    );
    fs.writeFileSync(
      path.join(outputDir, `${pair.name}_compressed_text.txt`),
      midresResult.extractedText
    );

    const comparisonReport = {
      testDate: new Date().toISOString(),
      hires: {
        path: hiresResult.imagePath,
        sizeKB: (hiresResult.imageSize / 1024).toFixed(2),
        processingTimeMs: hiresResult.processingTime,
        textLength: hiresResult.textLength,
        wordCount: hiresResult.wordCount,
        finnishChars: hiresResult.finnishChars
      },
      midres: {
        path: midresResult.imagePath,
        sizeKB: (midresResult.imageSize / 1024).toFixed(2),
        processingTimeMs: midresResult.processingTime,
        textLength: midresResult.textLength,
        wordCount: midresResult.wordCount,
        finnishChars: midresResult.finnishChars
      },
      comparison: {
        textLengthDiff: hiresResult.textLength - midresResult.textLength,
        wordCountDiff: hiresResult.wordCount - midresResult.wordCount,
        sizeDiff: ((hiresResult.imageSize - midresResult.imageSize) / 1024).toFixed(2) + ' KB',
        compressionRatio: (midresResult.imageSize / hiresResult.imageSize * 100).toFixed(2) + '%'
      }
    };

    fs.writeFileSync(
      path.join(outputDir, `${pair.name}_comparison_report.json`),
      JSON.stringify(comparisonReport, null, 2)
    );

    console.log(`\n💾 Results saved to: ${outputDir}/`);
    console.log(`   - ${pair.name}_uncompressed_text.txt`);
    console.log(`   - ${pair.name}_compressed_text.txt`);
    console.log(`   - ${pair.name}_comparison_report.json`);

    console.log('\n📈 Summary:');
    console.log(`   Image size difference: ${comparisonReport.comparison.sizeDiff}`);
    console.log(`   Compression ratio: ${comparisonReport.comparison.compressionRatio}`);
    console.log(`   Text length difference: ${comparisonReport.comparison.textLengthDiff} chars`);
    console.log(`   Word count difference: ${comparisonReport.comparison.wordCountDiff} words`);
  }

  console.log('\n✅ OCR quality test complete!');
}

// Run the test
testOCRQuality().catch(console.error);
