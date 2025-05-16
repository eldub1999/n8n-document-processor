/**
 * Fixed Auth Test for Supabase Edge Functions
 * This script handles JWT authentication properly
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Redirect console output to a file
const logFile = fs.createWriteStream('auth-test-output.log', { flags: 'w' });
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

// Load environment variables
dotenv.config();

// Hardcoded values for testing
const supabaseUrl = 'https://weewihugifrttuibusjf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXdpaHVnaWZydHR1aWJ1c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxNTk3MjMsImV4cCI6MjAzMDczNTcyM30.bxQEtQUkPZDhFY9F2dOX7Zp9bQyPZ5JMqeZcAj5Yk0Y';
// If testing with a specific ID, replace this
const requestId = 'b742794a-e58b-4f43-b057-f56499f7d95c';

console.log(`Starting test for request ID: ${requestId}`);
console.log(`Using Supabase URL: ${supabaseUrl}`);

async function runTest() {
  try {
    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');

    // Try to sign in first to get a proper auth token
    // This is necessary for functions that require authentication
    console.log('\nStep 1: Sign in to get authentication token...');
    let session = null;
    
    try {
      // Try to sign in with credentials if provided
      if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
        console.log(`Attempting to sign in as ${process.env.TEST_USER_EMAIL}...`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: process.env.TEST_USER_EMAIL,
          password: process.env.TEST_USER_PASSWORD
        });
        
        if (error) {
          console.error('Authentication error:', error.message);
        } else if (data) {
          session = data.session;
          console.log('Successfully signed in and got session token.');
        }
      } else {
        console.log('No test credentials found in environment variables. Will use anonymous token.');
      }
    } catch (authError) {
      console.error('Authentication exception:', authError);
    }
    
    // Step 2: Check the failing request ID
    console.log('\nStep 2: Checking for request ID in documents table...');
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', requestId);
    
    if (docError) {
      console.error('Error querying documents table:', docError.message);
    } else if (docData && docData.length > 0) {
      console.log('Document found!');
      console.log(JSON.stringify(docData[0], null, 2));
    } else {
      console.log('No document found with this ID');
    }
    
    // Step 3: Call edge function with authentication
    console.log('\nStep 3: Calling document-validation edge function...');
    let functionOptions = { 
      body: {
        fileId: 'test-file',
        userId: session?.user?.id || 'anonymous',
        filename: 'test.txt',
        contentType: 'text/plain'
      }
    };
    
    // Only set auth header if we have a session
    if (session) {
      console.log('Using authenticated session for function call');
      // No need to set anything, the client will use the session automatically
    } else {
      console.log('Using anonymous access for function call');
      // The client will use the anon key by default
    }
    
    try {
      const { data: funcData, error: funcError } = await supabase.functions
        .invoke('document-validation', functionOptions);
      
      if (funcError) {
        console.error('Edge function error:', funcError.message);
        console.error('Error details:', funcError);
      } else {
        console.log('Edge function response:');
        console.log(JSON.stringify(funcData, null, 2));
      }
    } catch (funcExc) {
      console.error('Exception calling edge function:', funcExc);
    }
    
    console.log('\nTest completed. Check the log file for details.');
    logFile.end();
    
  } catch (error) {
    console.error('Error during test:', error);
    logFile.end();
  }
}

// Run the test
runTest(); 