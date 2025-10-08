const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const form = new FormData();

// Add the three high-res images
form.append('images', fs.createReadStream(path.join(__dirname, 'assets/images/physics_hires/fyssa1_hires.jpg')));
form.append('images', fs.createReadStream(path.join(__dirname, 'assets/images/physics_hires/fyssa2_hires.jpg')));
form.append('images', fs.createReadStream(path.join(__dirname, 'assets/images/physics_hires/fyssa3_hires.jpg')));

// Add metadata
form.append('user_id', 'test-user-prompt-fix');
form.append('subject', 'Fysiikka');
form.append('category', 'core_academics');
form.append('grade', '8');
form.append('language', 'fi');

console.log('Sending request with updated prompt (no heat transfer example)...');

fetch('http://localhost:3001/api/mobile/exam-questions', {
  method: 'POST',
  body: form,
  headers: form.getHeaders()
})
  .then(res => res.json())
  .then(data => {
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.examId) {
      console.log('\nExam ID:', data.examId);
      console.log('Open in browser: http://localhost:3001/exam/' + data.examId);
      require('child_process').exec(`open "http://localhost:3001/exam/${data.examId}"`);
    }
  })
  .catch(err => console.error('Error:', err));
