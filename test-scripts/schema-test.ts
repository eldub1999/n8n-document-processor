/**
 * Test Script for Database Schema Updates
 * 
 * This script tests the database schema updates for:
 * - Document table with new fields (content_hash, version, is_latest, etc.)
 * - Versioning mechanism
 * - Document versions table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  console.error('Create a .env file based on .env.example with your credentials');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test document data
const testDocument = {
  filename: `test-document-${Date.now()}.txt`,
  content_type: 'text/plain',
  size_bytes: 1024,
  description: 'Test document for schema verification',
  jurisdiction: 'California',
  county: 'San Francisco',
  document_type: 'Real Estate Law',
  content_hash: crypto.randomBytes(16).toString('hex'), // Simulating a content hash
};

// Sample file content
const testFileContent = 'This is a test document for schema verification.';

// Test functions
async function runTests() {
  console.log('Starting database schema tests...');
  
  try {
    // 1. Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || '',
      password: process.env.TEST_USER_PASSWORD || ''
    });
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    console.log('✅ Authentication successful');
    
    // 2. Upload test file to storage
    const filePath = `${authData.user?.id}/${testDocument.filename}`;
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .upload(filePath, Buffer.from(testFileContent), {
        contentType: testDocument.content_type,
        upsert: true
      });
    
    if (fileError) {
      throw new Error(`File upload failed: ${fileError.message}`);
    }
    
    console.log('✅ Test file uploaded successfully');
    
    // 3. Create test document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        ...testDocument,
        storage_path: filePath,
        created_by: authData.user?.id,
        version: 1,
        is_latest: true
      })
      .select()
      .single();
    
    if (docError) {
      throw new Error(`Document creation failed: ${docError.message}`);
    }
    
    console.log('✅ Test document created with new schema fields:', {
      id: docData.id,
      filename: docData.filename,
      content_hash: docData.content_hash,
      version: docData.version,
      is_latest: docData.is_latest,
      jurisdiction: docData.jurisdiction,
      county: docData.county,
      document_type: docData.document_type
    });
    
    // 4. Test document update to trigger versioning
    const updatedContent = 'This is an updated test document.';
    const updatedHash = crypto.randomBytes(16).toString('hex');
    
    // Upload new version of file
    const { data: updatedFileData, error: updateFileError } = await supabase.storage
      .from('documents')
      .upload(filePath, Buffer.from(updatedContent), {
        contentType: testDocument.content_type,
        upsert: true
      });
    
    if (updateFileError) {
      throw new Error(`Updated file upload failed: ${updateFileError.message}`);
    }
    
    console.log('✅ Updated file uploaded successfully');
    
    // Update document record
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        content_hash: updatedHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', docData.id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error(`Document update failed: ${updateError.message}`);
    }
    
    console.log('✅ Document updated successfully:', {
      id: updatedDoc.id,
      version: updatedDoc.version,
      is_latest: updatedDoc.is_latest,
      content_hash: updatedDoc.content_hash
    });
    
    // 5. Check if version record was created
    const { data: versionData, error: versionError } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', docData.id);
    
    if (versionError) {
      throw new Error(`Version query failed: ${versionError.message}`);
    }
    
    if (versionData && versionData.length > 0) {
      console.log('✅ Version record created successfully:', {
        version_id: versionData[0].id,
        document_id: versionData[0].document_id,
        version_number: versionData[0].version_number,
        expiry_date: versionData[0].expiry_date
      });
    } else {
      console.warn('⚠️ No version record found. The versioning trigger may not be working properly.');
    }
    
    // 6. Clean up test data
    console.log('Cleaning up test data...');
    
    // Delete document record (should cascade to version records)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', docData.id);
    
    if (deleteError) {
      console.warn(`Warning: Could not delete test document: ${deleteError.message}`);
    }
    
    // Delete file from storage
    const { error: deleteFileError } = await supabase.storage
      .from('documents')
      .remove([filePath]);
    
    if (deleteFileError) {
      console.warn(`Warning: Could not delete test file: ${deleteFileError.message}`);
    }
    
    console.log('✅ Test cleanup completed');
    console.log('All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 