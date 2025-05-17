# Plan for Fixing Edge Function Authentication and Testing Request ID

## Current Issues Identified

1. **Authentication Error**: Both edge functions (`document-validation` and `document-processing`) return "Invalid JWT" errors when called with the anonymous API key.

2. **Local testing difficulties**: The local Docker environment is experiencing issues (container conflicts, out-of-memory errors), making local testing challenging.

3. **Request ID failure**: The specific request ID `b742794a-e58b-4f43-b057-f56499f7d95c` is failing, but we need to understand why.

## Progress and Findings

1. **Authentication Testing**:
   - Successfully deployed functions with `--no-verify-jwt` flag to bypass JWT verification
   - Created test functions that successfully receive and log the JWT token
   - Confirmed that the test endpoints properly handle the request ID `b742794a-e58b-4f43-b057-f56499f7d95c`
   - Verified the JWT token `hRohcWermGj3AFB4WqP1JPW4TBJoaJWLY+cF5WKNtYvQ4iPNCQsXdUSyjniB5xcs8VAHb+MSPFJ8VL3pUea5Ew==` is being received correctly

2. **Configuration Implementation**:
   - Added `config.toml` file to configure JWT verification for Edge Functions
   - Created client-side invocation script using the Supabase client that properly handles authentication
   - Added enhanced error handling and logging to the document-validation function
   - Successfully deployed updated Edge Functions

3. **Remaining Issues**:
   - The document-validation function still returns a non-2xx status code when invoked through the client
   - The error appears to be related to the file access or database operations
   - Need to add better error handling to identify the specific error

## Recommended Solution

Based on our findings, we recommend implementing the following solution:

1. **Configuration Approach**: 
   - Continue using the `config.toml` file to disable JWT verification for development/testing
   - Configure proper JWT verification for production deployment

2. **Client-Side Invocation**:
   - Use the Supabase client to invoke Edge Functions as shown in our test script
   - This approach properly handles authentication tokens and headers

3. **Error Handling Improvements**:
   - Add structured error logging to Edge Functions
   - Create specific error types for different kinds of failures
   - Implement graceful fallbacks for database and storage access

4. **Temporary Test Files**:
   - Create test files in the storage buckets to allow proper testing 
   - Implement a cleanup mechanism to remove test files

## Next Steps

1. Create a test file in the temp-uploads bucket for testing
2. Improve error handling in the document-validation function
3. Add database error simulation/handling for more robust code
4. Create a comprehensive test suite for Edge Functions

This approach will ensure reliable operation of the Edge Functions while maintaining proper security.

## Task Plan for Document Validation and Deduplication

### Completed Tasks:
1. ✅ Identified issues with edge function authentication
2. ✅ Created test functions for troubleshooting
3. ✅ Isolated JWT validation issues
4. ✅ Added JWT bypass method via config.toml
5. ✅ Created browser-based test for edge functions
6. ✅ Troubleshooted direct API invocation issues with JWT
7. ✅ Fixed module import errors in document-validation function
8. ✅ Created and deployed simplified version of document-validation function
9. ✅ Verified direct JWT token invocation works correctly
10. ✅ Documented edge function best practices in edgefunctions.md

### Next Steps:
1. Implement document deduplication in document-validation function:
   - Add hash-based content comparison
   - Integrate with database for duplicate checking
   - Return appropriate responses for duplicate detection

2. Update frontend to handle duplicate responses:
   - Add error handling for duplicate documents
   - Show user-friendly messages for duplicates
   - Prevent duplicate uploads in the UI

3. Create comprehensive tests for edge functions:
   - Test the document-validation with various file types
   - Verify duplicate detection works correctly
   - Create automated tests for CI/CD

### Notes:
- Direct JWT invocation now working with proper token formatting:
  - Token must include "Bearer " prefix
  - Properly formatted token allows direct API calls
  - Client SDK handles this automatically

- Production-ready document-validation function should include:
  - Proper error handling
  - Detailed logging
  - Content hash verification
  - Database integration for duplicate checking 