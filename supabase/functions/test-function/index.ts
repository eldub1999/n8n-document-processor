// @deno-types="https://deno.land/std/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// A simple edge function to test deployment with disabled JWT verification
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Log auth header for debugging
    const authHeader = req.headers.get('Authorization') || 'No Authorization header';
    console.log('Auth header:', authHeader);
    
    // Parse request body
    const requestData = await req.json();
    
    // Return a simple response with the received data for debugging
    return new Response(JSON.stringify({ 
      message: 'Test function running successfully with JWT verification disabled',
      timestamp: new Date().toISOString(),
      receivedData: requestData,
      receivedAuthHeader: authHeader
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    // Log and return any errors
    console.error('Error in test function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error',
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 