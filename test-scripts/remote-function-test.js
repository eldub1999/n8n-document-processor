/**
 * Remote Function Test for Supabase Edge Functions
 * Tests the deployed edge functions with proper authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redirect console output to a file
const logFile = fs.createWriteStream(path.join(__dirname, 'remote-test-output.log'), { flags: 'w' });
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const args = Array.from(arguments);
  logFile.write(args.join(' ') + '\n');
  originalConsoleLog.apply(console, args);
};

console.error = function() {
  const args = Array.from(arguments);
  logFile.write('ERROR: ' + args.join(' ') + '\n');
  originalConsoleError.apply(console, args);
};

// Configuration
const SUPABASE_URL = 'https://weewihugifrttuibusjf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXdpaHVnaWZydHR1aWJ1c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxNTk3MjMsImV4cCI6MjAzMDczNTcyM30.bxQEtQUkPZDhFY9F2dOX7Zp9bQyPZ5JMqeZcAj5Yk0Y';
const REQUEST_ID = 'b742794a-e58b-4f43-b057-f56499f7d95c';

// Function to test the document-validation edge function
async function testDocumentValidation() {
  console.log('Testing document-validation function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/document-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        requestId: REQUEST_ID,
        fileId: 'test-file',
        userId: 'test-user',
        filename: 'test-document.txt',
        contentType: 'text/plain'
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('JSON Response:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Response is not JSON');
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error testing document validation:', error.message);
    return false;
  }
}

// Function to test the document-processing edge function
async function testDocumentProcessing() {
  console.log('\nTesting document-processing function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/document-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        requestId: REQUEST_ID,
        documentId: 'test-document',
        storagePath: 'test-path',
        userId: 'test-user'
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('JSON Response:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Response is not JSON');
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error testing document processing:', error.message);
    return false;
  }
}

// Run the tests
(async () => {
  console.log('Starting remote function tests...');
  console.log(`Request ID being tested: ${REQUEST_ID}`);
  console.log('-----------------------------------');
  
  const validationSuccess = await testDocumentValidation();
  const processingSuccess = await testDocumentProcessing();
  
  console.log('\nTest Results:');
  console.log('-----------------------------------');
  console.log(`Document Validation: ${validationSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Document Processing: ${processingSuccess ? 'SUCCESS' : 'FAILED'}`);
  
  logFile.end();
})(); 