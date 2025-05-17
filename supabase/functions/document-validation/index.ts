// Minimal version that just uses the supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Simple handler to verify function is working
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info'
      }
    });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    
    // Log details for debugging
    console.log('Received request data:', JSON.stringify(requestData, null, 2));
    
    // Return information about environment
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document validation function is working correctly',
        receivedData: requestData,
        environment: {
          hasUrl: !!Deno.env.get('SUPABASE_URL'),
          hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        }
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error(`Error processing request:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}); 