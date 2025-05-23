# Edge Functions Documentation

**Project**: Legal Document Management System  
**Supabase Project**: `weewihugifrttuibusjf`  
**Last Updated**: January 23, 2025

## 📊 **CURRENT STATUS**

**Total Deployed**: 13 Edge Functions  
**Actually Needed**: 3 Functions  
**Should Remove**: 10 Redundant Functions

---

## ✅ **CORE PRODUCTION FUNCTIONS**

### 1. `document-processor` ✅ **KEEP**
- **Status**: ACTIVE, Working correctly
- **Purpose**: Main document processing pipeline
- **Features**:
  - Vertex AI text extraction using Gemini 2.5 Flash Preview
  - Legal-aware document chunking
  - VoyageAI embedding generation (voyage-3-large)
  - Intelligent batch processing with retry logic
  - Memory optimization for large files
- **Dependencies**: Google Cloud, VoyageAI, Supabase
- **JWT Verification**: Yes
- **Version**: 8 (Latest)
- **Entrypoint**: `/Users/laudon/Software Development/Cursor/n8n-workflow-test/supabase/functions/document-processor/index.ts`

### 2. `rag-chat` ❌ **HAS BUGS - NEEDS FIXING**
- **Status**: ACTIVE, Has critical bugs
- **Purpose**: Main RAG query processing and chat interface
- **Features**:
  - Semantic search with VoyageAI embeddings
  - Text search fallback
  - Claude Sonnet 4 response generation
  - Conversation storage and management
- **Critical Bugs**:
  - API key name mismatch: calls `voyage_api_key` but should be `voyage_ai_api_key`
  - Search result transformation issues
- **Dependencies**: VoyageAI, Claude (Vertex AI), Supabase
- **JWT Verification**: Yes
- **Version**: 3
- **Entrypoint**: `index.ts`

### 3. `document-validation` ⚠️ **OPTIONAL - KEEP FOR NOW**
- **Status**: ACTIVE, Working
- **Purpose**: Document upload validation and deduplication
- **Features**:
  - File type and size validation
  - Content hash generation for duplicate detection
  - Move files from temp to permanent storage
- **Dependencies**: Supabase Storage
- **JWT Verification**: Yes
- **Version**: 14
- **Entrypoint**: `index.ts`

---

## 🗑️ **REDUNDANT/UNUSED FUNCTIONS - MARKED FOR REMOVAL**

### 4. `document-processing` ❌ **REMOVE**
- **Status**: ACTIVE, Old version
- **Purpose**: Legacy document processing (replaced by document-processor)
- **Issue**: Basic metadata extraction only, no advanced features
- **Version**: 4
- **Reason for Removal**: Superseded by document-processor

### 5. `test-function` ❌ **REMOVE**
- **Status**: ACTIVE, Debug/Testing
- **Purpose**: JWT verification debugging
- **Features**: Simple echo service for testing auth
- **Version**: 2
- **Reason for Removal**: Development/testing function

### 6. `bypass-auth` ❌ **REMOVE**
- **Status**: ACTIVE, Debug/Testing
- **Purpose**: Authentication bypass for debugging
- **Security Risk**: YES - bypasses authentication
- **Version**: 2
- **Reason for Removal**: Security risk, debug only

### 7. `simple-test` ❌ **REMOVE**
- **Status**: ACTIVE, Debug/Testing
- **Purpose**: Authentication debugging
- **Features**: Request logging and echo
- **Version**: 2
- **Reason for Removal**: Development/testing function

### 8. `hash-existing-documents` ❌ **REMOVE**
- **Status**: ACTIVE, Utility
- **Purpose**: One-time utility to hash existing documents
- **Usage**: Migration utility, not needed for operations
- **Version**: 1
- **Reason for Removal**: One-time utility, migration complete

### 9. `document-validation-debug` ❌ **REMOVE**
- **Status**: ACTIVE, Debug version
- **Purpose**: Debug version of document validation
- **Features**: Simple echo for debugging document validation
- **Version**: 2
- **Reason for Removal**: Debug function, superseded by main validation

### 10. `rag-query` ❌ **REMOVE**
- **Status**: ACTIVE, Old version
- **Purpose**: Legacy RAG query processing
- **Features**: Vector search with Voyage AI, Claude responses
- **Version**: 1
- **Reason for Removal**: Superseded by rag-chat function

### 11. `rag-query-fallback` ❌ **REMOVE**
- **Status**: ACTIVE, Fallback version
- **Purpose**: Text-only RAG queries (no embeddings)
- **Features**: Text search fallback when embeddings fail
- **Version**: 1
- **Reason for Removal**: Functionality merged into rag-chat

### 12. `simple-rag-test` ❌ **REMOVE**
- **Status**: ACTIVE, Testing
- **Purpose**: Simple text search testing
- **Features**: Basic document text search
- **Version**: 1
- **Reason for Removal**: Testing function only

### 13. `test-vertex-auth` ❌ **REMOVE**
- **Status**: ACTIVE, Testing
- **Purpose**: Google Cloud/Vertex AI authentication testing
- **Features**: JWT creation, Vertex AI API testing
- **Version**: 2
- **Reason for Removal**: Testing function, auth verified working

---

## 📋 **PLANNED ACTIONS**

### **PHASE 1: Critical Bug Fixes**
1. ✅ Fix API key name in `rag-chat` function
2. ✅ Test end-to-end RAG functionality
3. ✅ Verify search functions work correctly

### **PHASE 2: Function Cleanup**
4. ✅ Remove 10 redundant/unused functions
5. ✅ Keep only: `document-processor`, `rag-chat`, `document-validation`

### **PHASE 3: Optimization**
6. ✅ Monitor performance of remaining functions
7. ✅ Update documentation as changes are made

---

## 🔧 **MAINTENANCE GUIDELINES**

### **Adding New Functions**
- Document purpose, dependencies, and JWT requirements
- Update this file when deploying new functions
- Remove test/debug versions after validation

### **Removing Functions**
- Verify no active dependencies before removal
- Update frontend code if function endpoints change
- Test system functionality after removals

### **Version Management**
- Keep track of function versions in this document
- Document breaking changes between versions
- Maintain rollback capability for critical functions

---

## 📊 **RESOURCE USAGE**

**Current**: 13 functions (excessive)  
**Target**: 3 functions (optimal)  
**Reduction**: 77% fewer functions  
**Benefits**: Cleaner deployment, easier maintenance, reduced costs

---

**Next Update**: After implementing fix plan and function cleanup 