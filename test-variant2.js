const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testExamGeneration() {
  console.log('Testing Variant 2 with photo1.jpg...\n');

  const form = new FormData();
  form.append('category', 'core_academics');
  form.append('grade', '5');
  form.append('images', fs.createReadStream('assets/images/photo1.jpg'));

  try {
    const response = await fetch('http://localhost:3001/api/mobile/exam-questions', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const data = await response.json();

    if (data.exam_id) {
      console.log('✅ Exam created successfully!');
      console.log('Exam ID:', data.exam_id);
      console.log('\nWaiting 3 seconds for exam to process...');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('\nRun this to analyze quality:');
      console.log('node -r dotenv/config analyze-latest-exam.js dotenv_config_path=.env.local');
    } else {
      console.log('❌ Error:', data.error || data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testExamGeneration();
