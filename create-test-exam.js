const fs = require('fs');
const http = require('http');

function createMultipartFormData(fields, files) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
  let body = '';

  // Add fields
  for (const [key, value] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }

  // Add files
  for (const [key, filepath] of Object.entries(files)) {
    const fileContent = fs.readFileSync(filepath);
    const filename = filepath.split('/').pop();

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"; filename="${filename}"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    body += fileContent.toString('binary');
    body += '\r\n';
  }

  body += `--${boundary}--\r\n`;

  return { boundary, body };
}

async function createExam() {
  console.log('Creating exam with Variant 2 prompt...\n');

  const { boundary, body } = createMultipartFormData(
    {
      category: 'core_academics',
      grade: '5'
    },
    {
      images: 'assets/images/photo1.jpg'
    }
  );

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/mobile/exam-questions',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body, 'binary')
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body, 'binary');
    req.end();
  });
}

createExam()
  .then(result => {
    console.log('✅ Success!');
    console.log('Exam ID:', result.exam_id);
    console.log('\nWaiting 5 seconds for processing...\n');

    setTimeout(() => {
      console.log('Now run:');
      console.log('node -r dotenv/config analyze-latest-exam.js dotenv_config_path=.env.local');
    }, 5000);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
