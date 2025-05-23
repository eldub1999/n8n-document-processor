import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get API keys from vault
async function getApiKey(keyName: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_api_key', { key_name: keyName });
  if (error) {
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
  return data;
}

// Helper function to convert PEM to DER format
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Test Google Cloud access token generation
async function testGoogleCloudAuth(): Promise<string> {
  try {
    console.log('📋 Testing Google Cloud service account authentication...');
    
    // Get service account JSON from vault
    console.log('🔑 Retrieving service account JSON from vault...');
    const serviceAccountJson = await getApiKey('google_service_account_json');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    console.log(`✅ Service account loaded: ${serviceAccount.client_email}`);
    console.log(`📦 Project ID: ${serviceAccount.project_id}`);
    
    // Create JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // Token expires in 1 hour
    
    // JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    // JWT payload
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: exp
    };
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature using Web Crypto API
    console.log('🔐 Creating JWT signature...');
    const textToSign = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(textToSign);
    
    // Import the private key
    const privateKeyPem = serviceAccount.private_key;
    const privateKeyDer = pemToDer(privateKeyPem);
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );
    
    // Sign the JWT
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${textToSign}.${encodedSignature}`;
    console.log('✅ JWT created successfully');
    
    // Exchange JWT for access token
    console.log('🎫 Exchanging JWT for access token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Access token obtained successfully');
    
    return tokenData.access_token;
    
  } catch (error) {
    console.error('❌ Google Cloud authentication failed:', error);
    throw new Error(`Google Cloud authentication failed: ${error.message}`);
  }
}

// Test Vertex AI API call
async function testVertexAI(accessToken: string): Promise<any> {
  try {
    console.log('🤖 Testing Vertex AI API call...');
    
    const projectId = 'vertex-ai-for-rag';
    const vertexAIUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

    // Simple test request
    const requestBody = {
      contents: [{
        role: "user",
        parts: [{
          text: "Hello! Please respond with 'Vertex AI authentication test successful' to confirm you're working."
        }]
      }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.1
      }
    };
    
    console.log(`📡 Calling Vertex AI API: ${vertexAIUrl}`);
    
    const response = await fetch(vertexAIUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Vertex AI API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Vertex AI API call successful');

    return result;
    
  } catch (error) {
    console.error('❌ Vertex AI API test failed:', error);
    throw new Error(`Vertex AI API test failed: ${error.message}`);
  }
}

// Edge Function handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  
  try {
    console.log('🧪 Starting Vertex AI authentication test...');
    
    // Test 1: Get access token
    const accessToken = await testGoogleCloudAuth();
    
    // Test 2: Call Vertex AI API
    const apiResult = await testVertexAI(accessToken);
    
    // Extract the response text
    let responseText = 'No response text found';
    if (apiResult.candidates && apiResult.candidates[0] && apiResult.candidates[0].content) {
      responseText = apiResult.candidates[0].content.parts[0].text;
    }
    
    console.log('🎉 All tests passed successfully!');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Vertex AI authentication test completed successfully',
        tests: {
          authentication: '✅ PASSED',
          vertexAI: '✅ PASSED'
        },
        vertexAIResponse: responseText,
        timestamp: new Date().toISOString()
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
    console.error('❌ Test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Vertex AI authentication test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}); 