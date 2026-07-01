const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const fetch = global.fetch || require('node:fetch');
(async () => {
  try {
    const filePath = path.join(process.cwd(), 'sample-test.mp4');
    const data = fs.readFileSync(filePath);
    const boundary = '----NodeFormBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="video"; filename="sample-test.mp4"\r\n`),
      Buffer.from(`Content-Type: video/mp4\r\n\r\n`),
      data,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    const res = await fetch('http://localhost:4000/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length.toString()
      },
      body
    });
    console.log('status', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.log('error body', text);
      process.exit(1);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync('optimized-response.mp4', Buffer.from(arrayBuffer));
    console.log('saved optimized-response.mp4', fs.statSync('optimized-response.mp4').size);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
