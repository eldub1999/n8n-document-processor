# N8N Workflow Setup Guide

This guide provides detailed instructions for setting up and configuring the n8n workflows for the document processing pipeline.

## Prerequisites

1. **n8n Instance**
   - Self-hosted or cloud n8n instance
   - Admin access to the instance
   - Ability to create and edit workflows

2. **Required Credentials**
   - Google Drive API credentials
   - Supabase API credentials
   - AI embedding service API key (OpenAI, etc.)

## Workflow 1: Google Drive Document Trigger

This workflow monitors a Google Drive folder for new documents and initiates the processing pipeline.

### Setup Steps

1. **Create New Workflow**
   - Name: `Document Detection - Google Drive`
   - Description: `Monitors Google Drive folder for new documents`

2. **Add Google Drive Trigger Node**
   - Node: `Google Drive Trigger`
   - Operation: `File/Folder Watch`
   - Folder ID: `[Your Google Drive Folder ID]`
   - Event: `File Created` and `File Updated`
   - Authentication: Configure Google Drive OAuth

3. **Add Function Node**
   - Name: `Prepare Document Data`
   - Code:
   ```javascript
   // Extract and format document metadata
   const items = [];
   for (const item of $input.all()) {
     const newItem = {
       json: {
         fileName: item.json.name,
         fileId: item.json.id,
         mimeType: item.json.mimeType,
         createdTime: item.json.createdTime,
         webViewLink: item.json.webViewLink,
         source: 'google_drive',
         status: 'pending'
       }
     };
     items.push(newItem);
   }
   return items;
   ```

4. **Add Supabase Node**
   - Operation: `Insert`
   - Table: `documents`
   - Fields to Send:
     - `title`: `{{ $json.fileName }}`
     - `source_id`: `{{ $json.fileId }}`
     - `source_type`: `google_drive`
     - `mime_type`: `{{ $json.mimeType }}`
     - `status`: `pending`
     - `metadata`: `{{ $json }}`

5. **Add Start Workflow Node**
   - Workflow: `Document Import`
   - Send Data: `true`

6. **Save and Activate Workflow**

## Workflow 2: Document Import

This workflow downloads documents from Google Drive and stores them in Supabase.

### Setup Steps

1. **Create New Workflow**
   - Name: `Document Import`
   - Description: `Downloads documents and stores in Supabase`

2. **Add Webhook Node (Start)**
   - Node: `Webhook`
   - Authentication: `None`
   - Method: `POST`
   - Path: `/document-import`
   - Response Mode: `Last Node`

3. **Add Google Drive Node**
   - Operation: `Download`
   - File ID: `{{ $json.source_id }}`
   - Binary Property: `data`

4. **Add Function Node**
   - Name: `Generate Storage Path`
   - Code:
   ```javascript
   // Generate a unique path for Supabase storage
   const items = [];
   for (const item of $input.all()) {
     const uuid = item.json.id || crypto.randomUUID();
     const fileName = item.json.title || item.json.fileName;
     const filePath = `documents_original/${uuid}/${fileName}`;
     
     item.json.original_path = filePath;
     items.push(item);
   }
   return items;
   ```

5. **Add Supabase Node**
   - Operation: `Upload`
   - Bucket: `documents_original`
   - File Path: `{{ $json.original_path }}`
   - Binary Property: `data`

6. **Add Supabase Node**
   - Operation: `Update`
   - Table: `documents`
   - ID: `{{ $json.id }}`
   - Fields to Send:
     - `original_path`: `{{ $json.original_path }}`
     - `status`: `imported`

7. **Add Start Workflow Node**
   - Workflow: `Document Processor`
   - Send Data: `true`

8. **Save and Activate Workflow**

## Workflow 3: Document Processor

This workflow pre-processes documents into RAG-optimized markdown.

### Setup Steps

1. **Create New Workflow**
   - Name: `Document Processor`
   - Description: `Converts documents to RAG-optimized markdown`

2. **Add Webhook Node (Start)**
   - Node: `Webhook`
   - Authentication: `None`
   - Method: `POST`
   - Path: `/document-process`
   - Response Mode: `Last Node`

3. **Add Supabase Node**
   - Operation: `Update`
   - Table: `documents`
   - ID: `{{ $json.id }}`
   - Fields to Send:
     - `status`: `processing`

4. **Add Supabase Node**
   - Operation: `Download`
   - Bucket: `documents_original`
   - File Path: `{{ $json.original_path }}`
   - Binary Property: `original_document`

5. **Add Switch Node**
   - Name: `Document Type Switch`
   - Value: `{{ $json.mime_type }}`
   - Cases:
     - `application/pdf`: PDF Processor
     - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`: Word Processor
     - `text/plain`: Text Processor
     - Default: Generic Processor

6. **Add HTTP Request Node (for each case)**
   - Name: `Convert to Markdown`
   - URL: `[Your Document Conversion API]`
   - Method: `POST`
   - Binary Data: `original_document`
   - Headers:
     - Content-Type: `{{ $json.mime_type }}`

7. **Add Function Node**
   - Name: `Optimize for RAG`
   - Code:
   ```javascript
   // Clean and optimize markdown for RAG
   const items = [];
   for (const item of $input.all()) {
     // Get the markdown content
     const content = item.binary.markdown.toString('utf8');
     
     // Optimize the content
     const optimized = optimizeForRag(content);
     
     // Create chunks (simplified example)
     const chunks = createChunks(optimized, 1000, 200);
     
     // Create document path
     const uuid = item.json.id;
     const processedPath = `documents_processed/${uuid}/processed.md`;
     
     // Update the item
     item.json.processed_path = processedPath;
     item.json.chunks = chunks;
     item.binary.processed_document = {
       data: Buffer.from(optimized, 'utf8'),
       mimeType: 'text/markdown',
       fileName: 'processed.md'
     };
     
     items.push(item);
   }
   
   // Helper functions
   function optimizeForRag(content) {
     // Remove headers, footers, etc.
     // Clean up formatting
     // Normalize content
     // This is simplified - implement actual optimization logic
     return content;
   }
   
   function createChunks(text, maxLength, overlap) {
     const chunks = [];
     let position = 0;
     
     while (position < text.length) {
       const end = Math.min(position + maxLength, text.length);
       chunks.push({
         content: text.substring(position, end),
         metadata: { start: position, end }
       });
       position = end - overlap;
     }
     
     return chunks;
   }
   
   return items;
   ```

8. **Add Supabase Node**
   - Operation: `Upload`
   - Bucket: `documents_processed`
   - File Path: `{{ $json.processed_path }}`
   - Binary Property: `processed_document`

9. **Add Function Node**
   - Name: `Prepare Chunks`
   - Code:
   ```javascript
   // Format chunks for database storage
   const items = [];
   for (const item of $input.all()) {
     const chunks = item.json.chunks;
     const documentId = item.json.id;
     
     for (let i = 0; i < chunks.length; i++) {
       items.push({
         json: {
           document_id: documentId,
           chunk_index: i,
           content: chunks[i].content,
           metadata: chunks[i].metadata
         }
       });
     }
   }
   return items;
   ```

10. **Add Supabase Node**
    - Operation: `Insert`
    - Table: `document_chunks`
    - Fields to Send:
      - `document_id`: `{{ $json.document_id }}`
      - `chunk_index`: `{{ $json.chunk_index }}`
      - `content`: `{{ $json.content }}`
      - `metadata`: `{{ $json.metadata }}`

11. **Add Function Node**
    - Name: `Update Document Status`
    - Code:
    ```javascript
    // Get the original document info
    const firstItem = $input.first();
    const documentId = firstItem.json.document_id;
    
    return [{
      json: {
        id: documentId,
        status: 'processed'
      }
    }];
    ```

12. **Add Supabase Node**
    - Operation: `Update`
    - Table: `documents`
    - ID: `{{ $json.id }}`
    - Fields to Send:
      - `status`: `processed`
      - `processed_path`: `{{ $node["Optimize for RAG"].json.processed_path }}`

13. **Add Start Workflow Node**
    - Workflow: `Embedding Generator`
    - Send Data: `true`

14. **Save and Activate Workflow**

## Workflow 4: Embedding Generator

This workflow generates embeddings for document chunks.

### Setup Steps

1. **Create New Workflow**
   - Name: `Embedding Generator`
   - Description: `Generates embeddings for document chunks`

2. **Add Webhook Node (Start)**
   - Node: `Webhook`
   - Authentication: `None`
   - Method: `POST`
   - Path: `/generate-embeddings`
   - Response Mode: `Last Node`

3. **Add Supabase Node**
   - Operation: `Select`
   - Table: `document_chunks`
   - Where:
     - Field: `document_id`
     - Operation: `Equal`
     - Value: `{{ $json.id }}`
   - Additional Fields:
     - Limit: 100 (adjust as needed)
     - Sort: `chunk_index` (ascending)

4. **Add HTTP Request Node**
   - Name: `Generate Embeddings`
   - URL: `[Your Embedding API URL]`
   - Method: `POST`
   - JSON Body:
     - `input`: `{{ $json.content }}`
     - `model`: `text-embedding-ada-002` (or your model of choice)
   - Authentication: API Key
   - Headers:
     - Authorization: `Bearer [Your API Key]`

5. **Add Function Node**
   - Name: `Map Embeddings to Chunks`
   - Code:
   ```javascript
   // Map embeddings back to chunks
   const items = [];
   for (const item of $input.all()) {
     const embedding = item.json.data ? item.json.data[0].embedding : null;
     if (embedding) {
       item.json.embedding = embedding;
       items.push(item);
     }
   }
   return items;
   ```

6. **Add Supabase Node**
   - Operation: `Update`
   - Table: `document_chunks`
   - ID: `{{ $json.id }}`
   - Fields to Send:
     - `embedding`: `{{ $json.embedding }}`

7. **Add Function Node**
   - Name: `Check Completion`
   - Code:
   ```javascript
   // Check if all chunks are processed
   // This is a simplified example
   const items = $input.all();
   const firstItem = items[0];
   const documentId = firstItem.json.document_id;
   
   return [{
     json: {
       id: documentId,
       status: 'embedded'
     }
   }];
   ```

8. **Add Supabase Node**
   - Operation: `Update`
   - Table: `documents`
   - ID: `{{ $json.id }}`
   - Fields to Send:
     - `status`: `embedded`

9. **Save and Activate Workflow**

## Additional Workflows

Detailed setup instructions for the following workflows will be added in future iterations:

- MVP2: Chat Interface
- MVP2: RAG Query Processing
- Beta 1: Webhook Receiver

## Workflow Testing

1. **Test Google Drive Trigger**
   - Upload a test document to the monitored Google Drive folder
   - Check if document record is created in Supabase

2. **Test Document Import**
   - Manually execute workflow with a document ID
   - Check if document is stored in Supabase storage

3. **Test Document Processor**
   - Manually execute workflow with a document ID
   - Check if processed document is created
   - Verify chunks are stored in database

4. **Test Embedding Generator**
   - Manually execute workflow with a document ID
   - Check if embeddings are stored in database

## Troubleshooting

- **Google Drive Connection Issues**
  - Verify OAuth credentials
  - Check folder permissions
  - Refresh OAuth token if needed

- **Supabase Connection Issues**
  - Verify API key
  - Check database permissions
  - Verify table structure

- **Embedding Generation Issues**
  - Check API key and quotas
  - Verify chunk sizes are appropriate
  - Check for rate limiting 