import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Configure logging
const logFile = fs.createWriteStream('invoke-function-output.log', { flags: 'w' })
console.log = function() {
  const args = Array.from(arguments)
  logFile.write(args.join(' ') + '\n')
  process.stdout.write(args.join(' ') + '\n')
}
console.error = function() {
  const args = Array.from(arguments)
  logFile.write('ERROR: ' + args.join(' ') + '\n')
  process.stderr.write('ERROR: ' + args.join(' ') + '\n')
}

// Function to invoke the document-validation Edge Function
async function invokeValidationFunction() {
  console.log('Invoking document-validation function with request ID b742794a-e58b-4f43-b057-f56499f7d95c')
  
  // Create Supabase client - using environment variables or defaults
  const supabaseUrl = process.env.SUPABASE_URL || 'https://weewihugifrttuibusjf.supabase.co'
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXdpaHVnaWZydHR1aWJ1c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUxNTk3MjMsImV4cCI6MjAzMDczNTcyM30.bxQEtQUkPZDhFY9F2dOX7Zp9bQyPZ5JMqeZcAj5Yk0Y'
  
  console.log(`Using Supabase URL: ${supabaseUrl}`)
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Debug - check authorization
    const { data: userData, error: userError } = await supabase.auth.getSession()
    console.log('Auth session:', userData ? 'Valid session' : 'No valid session')
    if (userError) {
      console.error('Auth error:', userError.message)
    }
    
    // Invoke the Edge Function with proper client-side authentication
    console.log('Invoking function...')
    const { data, error } = await supabase.functions.invoke('document-validation', {
      body: { 
        requestId: 'b742794a-e58b-4f43-b057-f56499f7d95c',
        fileId: 'test-file',
        userId: 'test-user',
        filename: 'test-document.txt',
        contentType: 'text/plain'
      },
    })
    
    if (error) {
      console.error('Error invoking function:', error.message)
      if (error.context) {
        console.error('Error context:', JSON.stringify(error.context, null, 2))
      }
    } else {
      console.log('Function response:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('Unexpected error:', error.message)
  }
}

// Run the function
invokeValidationFunction()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Failed:', err))
  .finally(() => logFile.end()) 