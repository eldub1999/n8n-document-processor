// Simple edge function with no JWT verification
Deno.serve(async (req) => {
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

  try {
    const data = await req.json();
    const authHeader = req.headers.get('Authorization') || 'No auth header';
    
    return new Response(JSON.stringify({
      message: 'Authentication bypassed successfully',
      receivedToken: authHeader,
      receivedData: data,
      requestId: data.requestId || 'No request ID provided'
    }), {
      status: 200, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error processing request: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 