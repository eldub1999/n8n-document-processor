# Supabase Edge Functions: Best Practices

## Overview

Supabase Edge Functions are serverless functions that run on Deno, providing a way to extend your backend functionality without managing server infrastructure. This document outlines best practices and lessons learned for developing, testing, and deploying Edge Functions.

## Authentication & JWT Verification

### Common Issues
- Direct curl requests to Edge Functions often fail with "Invalid JWT" errors
- Supabase client-side invocation handles authentication correctly
- JWT verification can interfere with development and testing

### Best Practices
1. **Configuration Options**:
   - Use `--no-verify-jwt` flag during development/testing: `supabase functions serve function-name --no-verify-jwt`
   - Configure permanent JWT verification settings in `config.toml`:
     ```toml
     [functions.function-name]
     verify_jwt = false
     ```

2. **Client-Side Invocation**:
   - Always use the Supabase client for proper authentication:
     ```javascript
     const { data, error } = await supabase.functions.invoke('function-name', {
       body: { /* request payload */ }
     })
     ```
   - Never rely on direct HTTP calls for production usage

3. **Testing Authentication**:
   - Create simplified test functions to isolate authentication issues
   - Test both authentication-bypassed and authenticated scenarios
   - Implement proper error handling for authentication failures

## Error Handling & Logging

### Best Practices
1. **Structured Error Responses**:
   - Use consistent error response format:
     ```javascript
     return new Response(
       JSON.stringify({ 
         success: false, 
         error: error.message,
         requestId: requestId
       }),
       { 
         status: statusCode,
         headers: {
           'Content-Type': 'application/json',
           'Access-Control-Allow-Origin': '*'
         }
       }
     );
     ```

2. **Comprehensive Logging**:
   - Log request details at the start of processing
   - Log important operation steps with relevant details
   - Include request ID in all log messages for traceability
   - Log headers for debugging authentication issues

3. **Graceful Error Handling**:
   - Catch and handle errors at multiple levels
   - Provide specific error messages for different failure types
   - Include helper functions for error formatting

## Function Structure & Performance

### Best Practices
1. **Code Organization**:
   - Separate core logic from request handling
   - Use helper functions for reusable operations
   - Implement clean separation of concerns

2. **Performance Considerations**:
   - Minimize database queries and storage operations
   - Use efficient data structures and algorithms
   - Implement proper cleanup of temporary resources

3. **Security Practices**:
   - Validate all input parameters
   - Use service role keys cautiously
   - Implement proper authorization checks

4. **Correct Module Imports**:
   - Be careful with Deno module imports - they can change between versions
   - Use correct import paths and exports for crypto and other modules
   - When using hashing, use the current API:
     ```typescript
     // Correct way to import and use crypto in Deno
     import { create } from "https://deno.land/std@0.202.0/crypto/mod.ts";
     
     // Create a hash
     const hash = await create("sha256").update(data).digest();
     ```

## Testing Strategies

### Local Testing
1. **Setup**:
   - Use `supabase functions serve function-name` for local development
   - Configure `--no-verify-jwt` flag or `config.toml` settings
   - Create test scripts that use the Supabase client

2. **Test Scripts**:
   - Implement dedicated test scripts for each function
   - Use proper logging to capture request/response details
   - Create test cases for both success and failure scenarios

3. **Debugging Techniques**:
   - Log headers and authentication tokens
   - Use structured logging with severity levels
   - Create simplified test functions to isolate issues

4. **Dealing with Local Environment Issues**:
   - If `supabase start` fails due to Docker conflicts, focus on remote testing
   - Use remote deployment for testing when local environment is problematic
   - Keep minimal test functions for isolating specific functionality

### Remote Testing
1. **Deployment Testing**:
   - Deploy functions with `supabase functions deploy function-name`
   - Verify function operation in the remote environment
   - Test with actual storage buckets and database

2. **Test Data**:
   - Create test files in storage buckets for function testing
   - Implement cleanup mechanisms to remove test data
   - Use unique identifiers for test data for easy tracking

3. **Direct Remote Testing**:
   - Use client-side invocation with proper authentication
   - Test against your production or development project directly
   - Set up separate test buckets to avoid affecting production data

4. **Debugging Remote Functions**:
   - Use the Supabase logs UI to examine function logs
   - Run specific test cases that produce identifiable log entries
   - Implement structured logging with standard error formats

## Deployment Workflow

### Best Practices
1. **Deployment Process**:
   - Test functions locally first (if environment allows)
   - Deploy with specific configuration settings: `supabase functions deploy function-name [--no-verify-jwt]`
   - Verify function operation after deployment with test scripts

2. **Version Control**:
   - Keep Edge Functions in version control
   - Maintain function configurations in `config.toml`
   - Document function changes and deployment requirements

3. **Monitoring**:
   - Implement proper logging for production monitoring
   - Add metrics collection for function performance
   - Set up alerts for function failures

## Troubleshooting Common Issues

### Docker/Local Environment Problems
- **Symptoms**: `supabase start is not running` errors, container conflicts, memory issues
- **Solutions**:
  - Focus on remote testing rather than local environment
  - Use standalone test scripts with direct API access
  - Deploy minimal test functions to isolate specific functionality
  - Implement client-side test scripts that don't require local Docker

### JWT Authentication Failures
- **Symptoms**: "Invalid JWT" errors when calling functions directly
- **Solutions**:
  - Always use the Supabase client for function invocation
  - Configure JWT verification settings in config.toml
  - Deploy with `--no-verify-jwt` during testing
  - Verify session management in test scripts

### Storage Access Issues
- **Symptoms**: Storage bucket access failures, "not found" errors
- **Solutions**:
  - Verify bucket names and paths (check for case sensitivity issues)
  - Ensure proper permissions in RLS policies
  - Create test files with known paths for verification
  - Implement specific error handling for storage operations

### Database Connection Problems
- **Symptoms**: Database query failures, connection errors
- **Solutions**:
  - Add specific error handling for database operations
  - Check RLS policies for proper access control
  - Test with minimal database operations first
  - Use transaction management for complex operations

### Boot Errors
- **Symptoms**: Function fails to start with message like "Function failed to start" or error logs showing "worker boot error"
- **Solutions**:
  - Check module import paths - they can change between Deno versions
  - Verify that all imported modules are correctly referenced
  - Look for syntax errors in the function code
  - Watch for incorrect API usage, such as the crypto module imports
  - Implement incremental testing with minimal functions to isolate issues
  - Check environment variables that might be referenced during initialization

## Common Edge Function Patterns

### Document Processing
```typescript
// Process documents with proper error handling
async function processDocument(fileId: string): Promise<Record<string, any>> {
  try {
    // 1. Fetch file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage.from('bucket-name')
      .download(fileId);
      
    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }
    
    // 2. Process file
    const result = await someProcessingFunction(fileData);
    
    // 3. Store results
    const { error: uploadError } = await supabaseClient
      .from('table-name')
      .insert({ result });
      
    if (uploadError) {
      throw new Error(`Database operation failed: ${uploadError.message}`);
    }
    
    return { success: true, result };
  } catch (error) {
    console.error(`Processing error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

### Authentication Wrapper
```typescript
// Helper function to handle authenticated requests
function requireAuth(handler) {
  return async (req) => {
    try {
      // Get JWT from request
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401 }
        );
      }
      
      // Verify JWT and get user
      const token = authHeader.replace('Bearer ', '');
      const { data: user, error } = await verifyToken(token);
      
      if (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401 }
        );
      }
      
      // Call handler with authenticated user
      return await handler(req, user);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }
  };
}
```

## Lessons Learned

1. **JWT Verification**:
   - Direct curl requests to Edge Functions fail with "Invalid JWT" errors
   - Supabase client-side invocation handles authentication correctly
   - Use config.toml for permanent JWT configuration settings

2. **Testing Approaches**:
   - Create simplified test functions to isolate issues
   - Test with the specific JWT token to verify reception
   - Implement proper error handling to identify specific errors
   - When local testing environment fails, focus on remote testing with proper client-side invocation

3. **Error Handling**:
   - Add comprehensive logging for each processing step
   - Handle database and storage access errors gracefully
   - Implement specific error types for different failure scenarios

4. **Performance Considerations**:
   - Minimize database queries and storage operations
   - Implement proper cleanup of temporary resources
   - Use efficient data structures and algorithms

5. **Environment Management**:
   - Local Docker environment may face conflicts and resource limitations
   - Remote deployment and testing can be more reliable than local testing
   - Use direct client invocation for reliable testing regardless of environment

6. **Module Import Issues**:
   - Be careful with module versions and import paths
   - The error `Uncaught SyntaxError: The requested module does not provide an export named 'X'` usually indicates incorrect import paths or API usage
   - Use incremental deployment and testing with minimal code to isolate import issues
   - Check Deno documentation for current module API usage patterns 