// Simple test function to debug authentication
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

  try {
    // Log details
    console.log(`Request received: ${req.method} ${new URL(req.url).pathname}`);
    const authHeader = req.headers.get('Authorization') || 'No auth header';
    console.log(`Auth header: ${authHeader}`);
    
    // Get request data
    let requestData = {};
    try {
      requestData = await req.json();
    } catch (e) {
      console.log('No JSON body or invalid JSON');
    }
    
    // Check for specific request ID
    const requestId = requestData.requestId || 'No request ID';
    if (requestId === 'b742794a-e58b-4f43-b057-f56499f7d95c') {
      console.log('Target request ID found!');
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Simple test function executed successfully',
      receivedAuthHeader: authHeader,
      requestId: requestId,
      receivedData: requestData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    // Return error response
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}); 