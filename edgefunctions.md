# Supabase Edge Functions: Implementation Guide for AI Assistants

This guide is designed for AI coding assistants to quickly implement Supabase Edge Functions with proper authentication, error handling, and deployment.

## Quick Start

```typescript
// Minimal working Edge Function template
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Function handler - starting point for your implementation
Deno.serve(async (req) => {
  // Handle CORS preflight
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
    const data = await req.json();
    
    // Process data...
    
    // Return successful response
    return new Response(
      JSON.stringify({ success: true, data: { /* results */ } }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    // Handle errors
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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
```

## Creating and Deploying Functions

### 1. Function Creation

```bash
# Create a new function
supabase functions new function-name

# Structure of the function
functions/
└── function-name/
    └── index.ts    # Main function code
```

### 2. Deployment

```bash
# Deploy with JWT verification (default)
supabase functions deploy function-name

# Deploy without JWT verification (for public functions)
supabase functions deploy function-name --no-verify-jwt
```

### 3. Configuration via config.toml

```toml
# ./supabase/config.toml
# Disable JWT verification for specific functions
[functions.function-name]
verify_jwt = false
```

## JWT Authentication: Implementation Guide

### Critical Authentication Points

1. **Key JWT Authentication Issues**:
   - Direct API calls require properly formatted JWT tokens
   - The Supabase client handles token management automatically
   - JWT verification is enabled by default for security

2. **Implementation Options**:

   a. **Client-Side Invocation (Recommended)**:
   ```javascript
   // Client-side code
   const { data, error } = await supabase.functions.invoke('function-name', {
     body: { /* payload */ }
   });
   
   if (error) console.error('Error:', error);
   else console.log('Result:', data);
   ```

   b. **Direct API Invocation with JWT**:
   ```javascript
   // Extract JWT token from authenticated Supabase client
   const token = supabase.auth.session()?.access_token;
   
   // Use token in fetch request
   const response = await fetch(
     'https://your-project-ref.supabase.co/functions/v1/function-name',
     {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ /* payload */ })
     }
   );
   ```

   c. **Curl Testing Example**:
   ```bash
   curl -X POST https://your-project-ref.supabase.co/functions/v1/function-name \
   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"param1": "value1"}'
   ```

### Authentication Implementation Within Edge Functions

```typescript
// Helper function to verify authentication - inside your Edge Function
async function requireAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  
  // Extract token - handle Bearer prefix
  const token = authHeader.replace('Bearer ', '');
  
  // Verify the token using Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );
  
  // You can use JWT validation here or rely on Supabase's default verification
  // This example gets the user from the token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid authorization');
  }
  
  return user;
}

// Usage in your Edge Function handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight...
  }
  
  try {
    // Verify authentication
    const user = await requireAuth(req);
    
    // Process authenticated request...
    const data = await req.json();
    
    // Return successful response...
  } catch (error) {
    // Return error response...
  }
});
```

## Common Pitfalls and Solutions

### 1. Module Import Errors

**Problem**: Errors like `The requested module does not provide an export named 'X'`

**Solution**:
```typescript
// Correct crypto module import - use create instead of createHash
import { create } from "https://deno.land/std@0.202.0/crypto/mod.ts";

// Create a hash correctly
const hash = await create("sha256").update(data).digest();
```

### 2. Boot Errors

**Problem**: Function fails to start with "Function failed to start"

**Solution**:
- Start with minimal function code and add complexity incrementally
- Check all import paths and export names carefully
- Verify environment variables are available at startup
- Test with a simplified function first:

```typescript
// Minimal function to verify deployment works
Deno.serve(async (req) => {
  return new Response(
    JSON.stringify({ success: true, message: "Function is working" }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
});
```

### 3. CORS Issues

**Problem**: Browser requests fail with CORS errors

**Solution**:
```typescript
// Always include proper CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info'
};

// Handle OPTIONS requests for CORS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

// Include same headers in your responses
return new Response(
  JSON.stringify({ success: true, data }),
  { 
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  }
);
```

## Database and Storage Access Patterns

### Accessing Supabase Services

```typescript
// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Database query - check for duplicates example
async function checkForDuplicates(contentHash) {
  const { data, error } = await supabaseClient
    .from('documents')
    .select('id, filename')
    .eq('content_hash', contentHash)
    .limit(1);
    
  if (error) throw new Error(`Database error: ${error.message}`);
  return { isDuplicate: data.length > 0, existingFile: data[0] };
}

// Storage operations
async function downloadFile(bucket, path) {
  const { data, error } = await supabaseClient
    .storage.from(bucket)
    .download(path);
    
  if (error) throw new Error(`Download failed: ${error.message}`);
  return data;
}
```

## Response Format Standards

### Successful Response

```typescript
return new Response(
  JSON.stringify({
    success: true,
    data: {
      // Your result data here
    },
    requestId: requestId // optional tracking
  }),
  { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  }
);
```

### Error Response

```typescript
return new Response(
  JSON.stringify({
    success: false,
    error: error.message,
    code: error.code, // optional error code
    requestId: requestId // optional tracking
  }),
  { 
    status: errorStatusCode, // appropriate HTTP status code
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  }
);
```

## Comprehensive Function Example

```typescript
// Complete Edge Function with authentication, error handling, and database operations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/std@0.202.0/crypto/mod.ts';

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Constants
const DOCUMENTS_BUCKET = 'documents';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info'
};

// Generate hash from file content
async function generateContentHash(fileData) {
  const hash = await create("sha256").update(fileData).digest();
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check for duplicates in database
async function checkForDuplicates(contentHash) {
  const { data, error } = await supabaseClient
    .from('documents')
    .select('id, filename')
    .eq('content_hash', contentHash)
    .limit(1);
    
  if (error) throw new Error(`Database error: ${error.message}`);
  return { isDuplicate: data.length > 0, existingFile: data[0] };
}

// Main function handler
Deno.serve(async (req) => {
  // Generate unique request ID for tracking
  const requestId = crypto.randomUUID();
  console.log(`Processing request ${requestId}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Parse request
    const { fileId, userId, filename } = await req.json();
    
    if (!fileId || !userId) {
      throw new Error('Missing required parameters');
    }
    
    console.log(`Processing file: ${filename} for user: ${userId}`);
    
    // Download file from temporary storage
    const fileData = await supabaseClient
      .storage.from('temp-uploads')
      .download(fileId);
      
    if (!fileData.data) {
      throw new Error(`File download failed: ${fileData.error?.message}`);
    }
    
    // Generate content hash
    const contentHash = await generateContentHash(fileData.data);
    console.log(`Content hash generated: ${contentHash}`);
    
    // Check for duplicates
    const { isDuplicate, existingFile } = await checkForDuplicates(contentHash);
    
    if (isDuplicate) {
      console.log(`Duplicate file detected: ${existingFile.filename}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Duplicate document detected',
          duplicateFile: existingFile,
          requestId
        }),
        { 
          status: 409, // Conflict status code
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          }
        }
      );
    }
    
    // Process the document (simplified example)
    console.log(`Document validation passed, processing file: ${filename}`);
    
    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document validated successfully',
        metadata: {
          contentHash,
          userId,
          filename
        },
        requestId
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      }
    );
  } catch (error) {
    // Log error details
    console.error(`Error processing request ${requestId}: ${error.message}`);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        requestId
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      }
    );
  }
});
```

## Testing Strategies

### Client-Side Testing (Recommended)

```javascript
// In Node.js or browser environment
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project-ref.supabase.co',
  'your-anon-key'
);

// Authenticate user if needed
await supabase.auth.signIn({
  email: 'test@example.com',
  password: 'test-password'
});

// Invoke function with authentication automatically handled
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: 'value1' }
});

console.log('Response:', data);
if (error) console.error('Error:', error);
```

### Direct Testing with Authentication Token

```javascript
// Get token from session
const session = supabase.auth.session();
const token = session?.access_token;

// Make direct request
const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/function-name',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ param1: 'value1' })
  }
);

const result = await response.json();
console.log('Result:', result);
```

### Testing Without Authentication

If testing a function with JWT verification disabled:

```bash
# Deploy function without JWT verification
supabase functions deploy function-name --no-verify-jwt

# Test with curl - no authentication required
curl -X POST https://your-project-ref.supabase.co/functions/v1/function-name \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'
```

## Monitoring and Debugging

- Access logs in Supabase Dashboard
- Use unique request IDs in all logging
- Structure log messages for easy searching
- Use console.log/console.error with descriptive prefixes
- Log key operations and state changes 