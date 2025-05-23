const fetch = require('node-fetch');

const url = 'https://weewihugifrttuibusjf.supabase.co/functions/v1/document-processor';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXdpaHVnaWZydHR1aWJ1c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzQ5ODUsImV4cCI6MjA2MzAxMDk4NX0.KKvPNAf2SvWaROYPZLtKEv0cM4Oe5nQ1oJ3H_FZdQj0';

async function testProcessing() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: '39dda786-bdee-4c36-93b0-7eadd8976b6b'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testProcessing(); 