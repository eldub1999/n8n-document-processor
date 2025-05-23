# Backend Development Guide (Supabase)

This guide provides detailed information for backend development of the Legal Document Management System, which heavily relies on Supabase services.

## 1. Overview

The backend is built entirely on Supabase, utilizing its PostgreSQL database, authentication, storage, and Edge Functions (Deno runtime).

Refer to `ARCHITECTURE.md` for the overall system architecture and how backend components interact with the frontend and external AI services.

## 2. Database (PostgreSQL)

Supabase provides a PostgreSQL database to store all structured data for the application.

### 2.1. Key Tables & Schema

Below are the primary tables. For a complete and up-to-date schema, always refer to the migrations in `supabase/migrations/`.

*   **`documents`**: Core table for document metadata.
    *   `id` (uuid, primary key): Unique identifier for the document.
    *   `filename` (text): Original filename of the uploaded document.
    *   `storage_path` (text): Path to the original document file in Supabase Storage (e.g., in the `documents` bucket).
    *   `content_type` (text): MIME type of the document (e.g., `application/pdf`).
    *   `size_bytes` (int8): File size in bytes.
    *   `created_by` (uuid, foreign key to `auth.users`): ID of the user who uploaded the document.
    *   `created_at` (timestamptz, default `now()`): Timestamp of upload.
    *   `updated_at` (timestamptz, default `now()`): Timestamp of the last update.
    *   `description` (text, nullable): Optional user-provided description.
    *   `content_hash` (text, unique): SHA-256 hash of the file content for deduplication.
    *   `version` (int4, default `1`): Current version number of the document.
    *   `is_latest` (bool, default `true`): Flag indicating if this is the latest version (relevant if versioning is fully implemented).
    *   `jurisdiction` (text): State/territory (e.g., "Arizona", "California") or "National".
    *   `county` (text, nullable): County name, applicable if jurisdiction is a state.
    *   `document_type` (text): Category of the document (e.g., "Real Estate Law", "Tax Law").

*   **`document_versions`**: Tracks historical versions of documents (as per `techstack.md` and `approach.md`, though its current usage level in `tasklist.md` might be minimal or planned for full implementation).
    *   `id` (uuid, primary key): Unique identifier for the version record.
    *   `document_id` (uuid, foreign key to `documents`): Reference to the parent document.
    *   `version_number` (int4): Sequential version number for the parent document.
    *   `storage_path` (text): Path to the archived version file in Supabase Storage (e.g., in an `archive` bucket).
    *   `created_at` (timestamptz, default `now()`): Timestamp when this version was created/archived.
    *   `created_by` (uuid, foreign key to `auth.users`): ID of the user who created this version.
    *   `expiry_date` (timestamptz, nullable): Calculated 5-year retention date from `created_at` (for automated cleanup, if implemented).

*   **`document_processing_status`**: Tracks the status of AI processing for each document.
    *   `document_id` (uuid, primary key, foreign key to `documents`): The document being processed.
    *   `status` (text): Current processing status (e.g., `pending_validation`, `pending_processing`, `processing_markdown`, `generating_embeddings`, `completed`, `failed`).
    *   `last_updated` (timestamptz, default `now()`): Timestamp of the last status update.
    *   `error_message` (text, nullable): Stores any error message if processing failed.
    *   `retry_count` (int4, default `0`): Number of processing attempts.

*   **`processed_markdown_documents`**: (Proposed in `WORKFLOW_ANALYSIS.md`, alignment with `tasklist.md` system state needed) Stores the RAG-optimized markdown content.
    *   `id` (uuid, primary key).
    *   `document_id` (uuid, foreign key to `documents`): Link to the original document.
    *   `markdown_content` (text): The processed markdown text.
    *   `storage_path` (text, nullable): If markdown is stored as a file in Supabase Storage instead of directly in this table.
    *   `created_at` (timestamptz, default `now()`).

*   **`document_embeddings`**: Stores text chunks and their corresponding vector embeddings.
    *   `id` (uuid, primary key).
    *   `document_id` (uuid, foreign key to `documents`): Link to the original document.
    *   `chunk_text` (text): The actual text chunk that was embedded.
    *   `embedding` (vector, e.g., `vector(1536)` for Voyage AI `voyage-3-large`): The vector embedding.
    *   `chunk_metadata` (jsonb, nullable): Any metadata associated with the chunk (e.g., page number, section).
    *   `created_at` (timestamptz, default `now()`).

*   **`chat_conversations`**: Stores metadata for chat sessions.
    *   `id` (uuid, primary key).
    *   `user_id` (uuid, foreign key to `auth.users`).
    *   `created_at` (timestamptz, default `now()`).
    *   `updated_at` (timestamptz, default `now()`): Last interaction time.
    *   `title` (text, nullable): Optional title for the conversation.

*   **`chat_messages`**: Stores individual messages within conversations.
    *   `id` (uuid, primary key).
    *   `conversation_id` (uuid, foreign key to `chat_conversations`).
    *   `user_id` (uuid, foreign key to `auth.users`, nullable if AI message).
    *   `role` (text): `user` or `assistant`.
    *   `content` (text): The message content.
    *   `created_at` (timestamptz, default `now()`).
    *   `metadata` (jsonb, nullable): E.g., source documents for assistant messages.

### 2.2. Row Level Security (RLS)

RLS is extensively used to control data access. Policies are defined directly in Supabase.
*   **General Principle:** Users can typically only access/modify their own data (e.g., their chat conversations, documents they uploaded). Admins may have broader access.
*   **Examples:**
    *   A user can only select their own `chat_conversations`.
    *   A user can only update `documents` where `created_by = auth.uid()`.
    *   All authenticated users might be able_to_read `documents` based on specific criteria (e.g., public documents or documents shared with them, though this isn't the current model which is simpler).
*   **Implementation:** RLS policies are written in SQL and applied to tables. Refer to the Supabase dashboard or migration files for exact policies.

### 2.3. Database Functions & Triggers

*   **`pgvector` Extension:** Used for vector similarity searches (e.g., finding relevant document chunks for RAG).
*   **Search Functions:** Custom SQL functions might be created for complex search queries, especially combining vector search with metadata filtering (e.g., `search_documents_by_text` mentioned in `CODE_REVIEW_ISSUES.md`).
*   **Triggers:** Database triggers are intended to automate parts of the processing pipeline (e.g., initiating document processing when a new document record is inserted or a file is uploaded to storage). The `tasklist.md` indicates these triggers may need verification and fixing, particularly for storage events invoking Edge Functions.

## 3. Supabase Storage

Supabase Storage is used for storing file blobs, primarily legal documents.

### 3.1. Bucket Structure

*   **`documents` (Private):** Main storage for original, validated legal documents.
*   **`temp-uploads` (Private):** Staging area for files during the upload and validation process. Files here are short-lived.
*   **`processed-markdown` (Private, Proposed):** If processed markdown versions of documents are stored as files rather than directly in a database table.
*   **`archive` (Private, Planned/Existing):** For storing previous versions of documents if the versioning feature is fully implemented.

### 3.2. Access Control & Policies

*   Buckets are typically **private**. Access is controlled via Supabase Storage policies, often in conjunction with RLS on metadata tables or through signed URLs generated by Edge Functions.
*   Frontend typically uploads to `temp-uploads` using a signed URL or client library method that enforces policies.
*   Edge Functions have service-level access to move files between buckets or read files for processing.

## 4. Edge Functions (Deno Runtime)

Supabase Edge Functions are server-side TypeScript functions executed in a Deno environment. They are used for custom business logic, integrating with third-party AI services, and performing operations that require secure credentials or server-side context.

*Refer to `edgefunctions.md` for the historical list and cleanup plan. This guide focuses on the core, active functions and development patterns.* The `tasklist.md` notes `document-processor (v8)`, `rag-chat (v7)`, and `document-validation (v14)` as the core functions to keep.

### 4.1. Core Active Functions

*   **`document-validation` (v14)**
    *   **Purpose:** Handles initial document upload validation, deduplication, and secure file movement.
    *   **Trigger:** Typically invoked by the frontend after a file is uploaded to the `temp-uploads` bucket (or ideally, directly by a Supabase Storage event on `temp-uploads` - this trigger mechanism is under review per `tasklist.md`).
    *   **Key Operations:**
        *   File type and size validation.
        *   SHA-256 content hash generation.
        *   Duplicate check against `content_hash` in the `documents` table.
        *   If unique and valid: moves the file from `temp-uploads` to the `documents` bucket.
        *   Creates/updates a record in the `documents` table with metadata.
        *   (Ideally) Creates a `document_processing_status` record.
    *   **JWT Verification:** Yes (as per `edgefunctions.md`).
    *   **Dependencies:** Supabase Client (for DB and Storage interaction).

*   **`document-processor` (v8)**
    *   **Purpose:** Orchestrates the main AI-driven document processing pipeline after validation.
    *   **Trigger:** Ideally triggered by a new confirmed document entry (e.g., via a database trigger on the `documents` table or a status update in `document_processing_status`). Currently may rely on manual or frontend invocation if triggers are not fully operational.
    *   **Key Operations:**
        *   Retrieves original document from `documents` storage.
        *   **Text Extraction/Conversion:** Calls Google Vertex AI (e.g., Gemini for multimodal, or Document AI) to convert the document to markdown.
        *   (Proposed) Stores processed markdown (either in a dedicated table or `processed-markdown` storage bucket).
        *   **Chunking:** Implements legal-aware document chunking logic on the markdown content.
        *   **Embedding Generation:** Sends text chunks to Voyage AI (model: `voyage-3-large`) to generate vector embeddings.
        *   Stores embeddings and chunk text in the `document_embeddings` table.
        *   Updates `document_processing_status` throughout its lifecycle.
        *   Includes batch processing logic and retry mechanisms.
    *   **JWT Verification:** Yes.
    *   **Dependencies:** Supabase Client, Google Cloud Client Libraries, Voyage AI Client/API.

*   **`rag-chat` (v7)**
    *   **Purpose:** Powers the Retrieval-Augmented Generation chat functionality.
    *   **Trigger:** HTTP POST request from the frontend when a user sends a chat message.
    *   **Key Operations:**
        *   Receives user query and any active metadata filters (jurisdiction, document type).
        *   Generates an embedding for the user's query using Voyage AI.
        *   Performs a vector similarity search in the `document_embeddings` table (using `pgvector`) against the query embedding, applying metadata filters.
        *   Retrieves the content of the top N relevant document chunks.
        *   (Future) May incorporate a reranking step here.
        *   Constructs a prompt for an LLM (Claude 3 Sonnet via Vertex AI) using the retrieved chunks as context and the original query.
        *   Sends the prompt to Vertex AI and receives the LLM-generated response.
        *   Stores the conversation turn (user query and assistant response) in `chat_messages` and `chat_conversations` tables.
        *   Returns the LLM response to the frontend.
    *   **JWT Verification:** Yes.
    *   **Dependencies:** Supabase Client, Voyage AI Client/API, Google Cloud Client Libraries (for Vertex AI).
    *   **Key Fixes in v7 (from `edgefunctions.md` & `tasklist.md`):** Corrected API key names, lowered similarity threshold, fixed Base64 decoding, dynamic Project ID for Vertex AI, correct metadata in search results, updated Claude model ID.

### 4.2. Development Patterns & Conventions

*   **Shared Code:** Common utilities (e.g., Supabase client initialization, custom error classes) can be placed in a `_shared` directory within `supabase/functions/` and imported by multiple functions.
*   **Environment Variables & Secrets:** API keys for external services (Voyage AI, Google Cloud) and other sensitive configurations should be stored as Supabase secrets (`supabase secrets set MY_KEY=value`) and accessed within functions via `Deno.env.get("MY_KEY")`.
    *   Default Supabase env vars like `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available.
*   **Error Handling:** Implement robust error handling, including try-catch blocks, logging errors, and returning meaningful error responses (e.g., appropriate HTTP status codes and JSON error messages).
*   **CORS Headers:** Ensure Edge Functions that are called from the browser include appropriate CORS headers in their responses. Often, this is handled by wrapping the main function logic with a CORS handler or by returning headers like:
    ```typescript
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders, // Predefined CORS headers
        'Content-Type': 'application/json'
      },
      status: 200
    });
    ```
*   **Local Development & Testing:** Use the Supabase CLI to serve functions locally (`supabase functions serve <function-name>`) and invoke them using tools like `curl` or Postman. Test JWT verification by passing a valid token.
*   **Deployment:** Deploy functions using `supabase functions deploy <function-name>`.

### 4.3. Guidelines for Adding/Removing Functions

*   **Adding:**
    *   Clearly define the function's purpose and trigger mechanism.
    *   Document its dependencies (internal and external).
    *   Specify its JWT verification policy.
    *   Follow established error handling and logging patterns.
    *   Update `document_index.md` and this guide if the function is a core, persistent one.
    *   Remove any temporary debug/test versions once the main function is validated.
*   **Removing:**
    *   Verify no active parts of the frontend or other backend processes depend on the function.
    *   If replacing a function, ensure a smooth transition (e.g., deploy new version, update callers, then remove old one).
    *   Clean up any associated Supabase secrets if they are no longer needed.
    *   Update documentation.

## 5. API Endpoints

For the most part, the frontend interacts with Supabase services (Database, Auth, Storage) via the Supabase JS client library, which abstracts direct HTTP API calls.

Edge Functions themselves create HTTP endpoints when deployed. The URL format is typically:
`https://<project_ref>.supabase.co/functions/v1/<function-name>`

These are the primary custom API endpoints for the application.

*(This guide will be updated as the backend evolves. Always refer to the actual code, Supabase dashboard configurations, and migration files for the ground truth.)* 