-- Script to identify and handle legacy documents without content hashes
-- This script helps manage documents uploaded before the deduplication system

-- 1. Check how many documents need hashes
SELECT 
  COUNT(*) as total_documents,
  COUNT(content_hash) as documents_with_hash,
  COUNT(*) - COUNT(content_hash) as documents_needing_hash
FROM documents;

-- 2. List all documents without hashes
SELECT 
  id,
  filename,
  storage_path,
  size_bytes,
  created_at,
  'NEEDS_HASH' as status
FROM documents 
WHERE content_hash IS NULL
ORDER BY created_at DESC;

-- 3. Mark legacy documents for easy identification (optional)
-- You can add a 'legacy' flag or comment for documents without hashes
-- UPDATE documents 
-- SET description = COALESCE(description || ' ', '') || '[Legacy Document - Pre-Deduplication]'
-- WHERE content_hash IS NULL AND (description IS NULL OR description NOT LIKE '%Legacy Document%');

-- 4. Current deduplication status
SELECT 
  'Deduplication Status' as report_type,
  CASE 
    WHEN COUNT(*) - COUNT(content_hash) = 0 THEN 'COMPLETE - All documents have hashes'
    ELSE CONCAT(COUNT(*) - COUNT(content_hash), ' documents need hashing')
  END as status
FROM documents;

-- 5. Show recent uploads with hashes (should be new uploads after deduplication system)
SELECT 
  filename,
  content_hash,
  created_at,
  'NEW_WITH_HASH' as status
FROM documents 
WHERE content_hash IS NOT NULL
ORDER BY created_at DESC; 