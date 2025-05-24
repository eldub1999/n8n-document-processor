# Task List - Legal Document Management System

## Status: Paused SA-301 (Advisor Recs) to Apply DB-201 Migrations

## ✨ NEW TASK (ACTIVE)

### **CW-401: End-to-End Code Walkthrough**
**BRANCH**: `feature/CW-401-e2e-workflow-review`
**GOAL**: Perform a comprehensive code walkthrough of key system workflows to ensure correctness, consistency, and logical flow, building confidence for E2E testing.

**STATUS**: In Progress

**KEY WORKFLOWS TO REVIEW**:
1.  **User Authentication & Session Management**
2.  **Document Upload & Initial Processing** (incl. `document-validation` function)
3.  **Document Content Processing & Embedding (RAG Pipeline)** (incl. `document-processor` function)
4.  **Chat Interface & RAG Querying** (incl. `rag-chat` function)
5.  **Document Versioning & Cleanup** (briefly, triggers and cleanup script)

**SUB-TASKS**:
- [x] Review User Authentication flow.
- [x] Review Document Upload and `document-validation` flow.
- [x] Review `document-processor` Edge Function and RAG pipeline initiation.
- [x] Review Chat Interface (`rag-chat` function) and query flow.
- [x] Briefly review document versioning and cleanup logic.
- [x] Document findings and areas for attention during E2E testing.

**KEY FINDINGS & NOTES FOR E2E TESTING**:
- **Authentication**: Standard Supabase email/password auth. Session management via Supabase client.
- **Document Upload (`document-validation` function)**:
    - Robust flow: Temp upload -> Edge Function validation (hash, duplicate check, type/size) -> DB record & move to final storage.
    - Frontend (10MB) and backend (50MB) size limits differ slightly (backend is looser, which is fine).
    - File type validation also differs slightly (frontend no .rtf, backend includes .rtf).
    - Final storage uses `application/octet-stream`; original content type is in DB but not explicitly set on the stored file object's metadata.
- **Document Processing (`document-processor` function)**:
    - Complex function using Vertex AI (Gemini 2.5 Flash) for text extraction/Markdown conversion and Voyage AI (`voyage-large-2`) for embeddings.
    - Relies on `get_api_key` and `update_processing_progress` RPCs in Supabase.
    - Vertex AI prompt is tailored for legal docs.
    - Custom chunking logic for legal text.
    - Conservative token counting and batching.
    - Potential for long execution times for large documents (async, so user not blocked).
- **Chat/RAG (`rag-chat` function)**:
    - Uses Voyage AI (`voyage-3-large`) for query embeddings (can return just embedding if `generateEmbeddingOnly` is true).
    - **CRITICAL**: Calls `search_similar_embeddings` RPC for semantic search. Its capability to correctly handle `filter_jurisdictions` and `filter_document_types` (as per a TODO in code) MUST be verified.
    - Semantic search result transformation passes document metadata (filename, jurisdiction) to LLM context.
    - Fallback to full-text search is implemented, which also attempts metadata filtering.
    - Uses Google Vertex AI with `gemini-1.5-flash-latest` for response generation (contrary to top-level comments mentioning Claude Sonnet 4).
    - Stores conversation in `chat_conversations` and `chat_messages`. Includes document sources, but `embedding_sources` is empty.
    - **MISSING**: Explicit handling of prior conversation messages being passed to the LLM for multi-turn chat context. Current LLM prompt seems geared for single Q&A based on retrieved context.
    - Good source formatting in the final API response for frontend display.
- **Versioning & Cleanup**: 
    - Handles exact duplicate uploads by rejecting them (based on `content_hash` and `is_latest: true`).
    - `documents` table has `version` (always 1) and `is_latest` (always true) fields for new uploads.
    - No explicit "update version" flow for an existing document ID; new unique content results in a new document record.
    - Manual deletion of document entities via `deleteDocument` function (deletes DB record and storage file).
    - No automated cleanup scripts for old versions or orphaned files were identified.

**NEXT STEPS**:
- Conclude CW-401 End-to-End Code Walkthrough.
- Proceed with E2E testing, paying close attention to the critical points identified (especially the `search_similar_embeddings` RPC and LLM behavior).

- **IMMEDIATE NEXT STEPS**:
  - Finalize CW-401 walkthrough task.
  - Confirm readiness for E2E testing with the user.

---

## 📝 DOCUMENTATION NOTE (IMPORTANT)

**With the new documentation structure (`document_index.md`, `ARCHITECTURE.md`, `BACKEND_GUIDE.md`, `FRONTEND_GUIDE.md`), please ensure that any permanent architectural insights, stable component descriptions, or resolved design decisions are moved from this `tasklist.md` into the appropriate static documentation files.**

This `tasklist.md` should remain focused on dynamic operational tasks, active bug tracking, current system status, and immediate next steps. Avoid letting it become a long-term knowledge silo for information better suited to the more permanent guides. Link to the relevant sections in the static docs from here if needed for context on a task.

---

## 🔥 **IMMEDIATE NEXT STEPS (THIS SESSION)**

### **🚀 ACTIVE TASK: Apply & Test DB-201 Schema Migrations from `develop` branch**
**GOAL**: Apply migrations `06_` through `11_` to the Supabase environment to implement RLS, indexing, and ENUM changes. This is a prerequisite to accurately assessing further Supabase Advisor recommendations.

**SUB-TASKS:**
-   [X] **Migrations created and merged to `develop`** (Tasks `06_` to `11_` for RLS, Indexing, ENUMs).
-   [ ] **Switch to `develop` branch locally.**
-   [ ] **Ensure Supabase CLI is connected to the correct project.**
-   [ ] **Run `supabase migration up` to apply pending migrations.**
-   [ ] **Verify migration application in Supabase Dashboard (check schema, RLS policies).**
-   [ ] **Conduct thorough testing of application functionality post-migration.**
    -   [ ] Test RLS policies for all affected tables.
    -   [ ] Test data integrity with new ENUM types.
    -   [ ] Test queries benefiting from new indexes.
    -   [ ] Confirm `document_versions` table and versioning triggers are working.
-   [ ] **Once migrations are confirmed stable, resume SA-301 (Advisor Recommendations).**

---

### **⏸️ PAUSED TASK: SA-301 - Supabase Advisor Recommendations**
**BRANCH**: `feature/SA-301-advisor-recommendations`
**GOAL**: Address Supabase Advisor security and performance recommendations and document them in `supabase_kb.md`.
**STATUS**: Paused. Can be resumed after DB-201 migrations are stable on remote.

**SUB-TASKS:**
-   [X] Create branch `feature/SA-301-advisor-recommendations`.
-   [X] Create `supabase_kb.md`.
-   [X] Documented: "RLS Disabled on `public.processed_markdown_documents`" (fix pending migration application from `develop`).
-   [ ] Address next Advisor item.

---

### **PREVIOUSLY COMPLETED MAJOR TASKS:**
*   **DB-201 - Database Schema Review, Optimization, and Security Hardening (Migrations created, merged to `develop`)**
*   **CF-101 - Edge Function Cleanup (Merged to `develop`)**

---

##  backlog & Future Tasks

*   **TASK: Document Processing Trigger Investigation**
    *   **Goal**: Resolve why `document-validation` (or initial processing step) is not triggering reliably on Supabase Storage upload.
    *   [ ] Verify Supabase Storage trigger configuration in `config.toml` and on the dashboard.
    *   [ ] Test with a minimal viable trigger function.
    *   [ ] Check function logs exhaustively.
    *   [ ] Consider alternative trigger mechanisms if needed (e.g., event-driven architecture via Supabase Realtime or Postgres LISTEN/NOTIFY).
*   **TASK: Full E2E System Test**
    *   Once trigger is fixed and data processing pipeline is confirmed operational.
    *   Test document upload, processing, embedding, RAG chat, versioning.
*   **TASK: Advanced RAG UI Features**
    *   Allow user to select specific documents for chat context.
    *   Display document sources for RAG responses.
*   **TASK: User Roles & Permissions**
    *   Define admin roles, potentially other user roles.
    *   Implement UI and backend logic for role management if necessary.
*   **TASK: Admin Dashboard**
    *   Basic overview of system status, user activity, document counts.
*   **TASK: Review & Refine `calculate_expiry_date()` and `cleanup_expired_document_versions()`**
    *   Ensure 5-year expiry is appropriate.
    *   Confirm scheduling mechanism for cleanup (e.g., `pg_cron`).
*   **DB-201: Apply Database Migrations to Supabase Instance (Local Done, Remote Pending)**
    *   Status: Local migrations applied successfully. Pending remote application.
    *   Sub-Tasks:
        - ~~Dump current database schema to identify tables missing from early migrations.~~ (Done)
        - ~~Get DDL for `processed_markdown_documents` from remote.~~ (Done)
        - ~~Get DDL for `document_processing_status` from remote.~~ (Done)
        - ~~Get DDL for `document_embeddings` from remote.~~ (Done)
        - ~~Update DDL for `document_embeddings` with correct vector dimensions.~~ (Done - 1024 dimensions)
        - ~~Get DDL for `chat_conversations` from remote.~~ (Done)
        - ~~Get DDL for `chat_messages` from remote.~~ (Done)
        - ~~Create catch-up migration for `processed_markdown_documents` (`051_...`).~~ (Done)
        - ~~Create catch-up migration for `document_processing_status` (`052_...`).~~ (Done)
        - ~~Create catch-up migration for `document_embeddings` (`053_...`).~~ (Done)
        - ~~Create catch-up migration for `chat_conversations` (`054_...`).~~ (Done)
        - ~~Create catch-up migration for `chat_messages` (`055_...`).~~ (Done)
        - ~~Create migration to enable `vector` extension (`000_...`).~~ (Done)
        - ~~Fix migration ordering issues.~~ (Done)
        - ~~Apply all migrations to local Supabase instance.~~ (Done)
        - ~~Commit new migration files to `develop` branch.~~ (Done)
        - **Plan and apply migrations to remote Supabase instance.** (Pending)
        - **Test application functionality thoroughly on remote after migration.** (Pending)

This `tasklist.md` is intended for AI agent use and may not be human-readable.
Last update: 2024-05-23 15:47:00