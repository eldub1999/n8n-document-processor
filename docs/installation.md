# Installation and Setup Guide

This guide provides step-by-step instructions for setting up the N8N Document Processing & RAG Workflow project using n8n.cloud.

## Prerequisites

1. **n8n.cloud Account**
   - An active n8n.cloud account (Free or paid plan)
   - [Sign up for n8n.cloud](https://n8n.io/cloud/)

2. **Supabase**
   - A Supabase project (Free, Pro, or Team plan)
   - Vector storage support (available on all plans)
   - [Create a Supabase account](https://supabase.com)

3. **Google Drive API**
   - Google Cloud account with Google Drive API enabled
   - OAuth client ID and secret
   - [Google Cloud Console](https://console.cloud.google.com/)

4. **AI Service**
   - Account with embedding capabilities (OpenAI, Cohere, etc.)
   - API key for the service
   - For OpenAI: [Create an account](https://platform.openai.com/signup)

## Installation Steps

### 1. Set Up n8n.cloud

1. **Sign Up/Login**
   - Go to [n8n.cloud](https://n8n.io/cloud/)
   - Create an account or log in to your existing account
   - Select a plan that fits your needs

2. **Create Workspace**
   - If you don't have one yet, create a workspace
   - This will be where all your workflows live

### 2. Set Up Supabase

1. **Create a New Supabase Project**
   - Login to your Supabase account
   - Click "New Project"
   - Enter project details and select a region
   - Wait for the project to initialize

2. **Configure Storage Buckets**
   - Go to Storage > Buckets
   - Create new bucket: `documents_original`
   - Create new bucket: `documents_processed`
   - Set appropriate permissions (default: restricted)

3. **Create Database Tables**
   - Go to SQL Editor
   - Copy the SQL from `docs/supabase-design.md`
   - Execute the SQL to create tables and functions

4. **Enable Vector Extension**
   - Go to SQL Editor
   - Run:
   ```sql
   -- Enable the vector extension
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

5. **Get API Credentials**
   - Go to Project Settings > API
   - Note your project URL and API keys
   - Use the `service_role` key for n8n integration

### 3. Configure Google Drive API

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Google Drive API**
   - Go to APIs & Services > Library
   - Search for "Google Drive API"
   - Click "Enable"

3. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - Select "External" user type (or "Internal" for testing)
   - Complete the required fields
   - Add required scopes:
     - `https://www.googleapis.com/auth/drive.metadata.readonly`
     - `https://www.googleapis.com/auth/drive.readonly`

4. **Create OAuth Client ID**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `https://app.n8n.cloud/oauth/callback` (adjust if using a different n8n.cloud domain)
   - Note your Client ID and Client Secret

### 4. Configure AI Service (OpenAI Example)

1. **Create OpenAI Account**
   - Sign up at [OpenAI Platform](https://platform.openai.com/signup)

2. **Create API Key**
   - Go to API Keys
   - Click "Create new secret key"
   - Note your API key

### 5. Configure n8n.cloud

1. **Add Credentials**
   - Google Drive OAuth:
     - Go to Settings > Credentials
     - Click "Add Credential"
     - Select "Google Drive OAuth2 API"
     - Enter your Client ID and Client Secret
     - Save and complete the OAuth flow
   
   - Supabase API:
     - Go to Settings > Credentials
     - Click "Add Credential"
     - Select "Supabase API"
     - Enter your Supabase URL and API Key (service_role)
     - Save
   
   - OpenAI API:
     - Go to Settings > Credentials
     - Click "Add Credential"
     - Select "OpenAI API"
     - Enter your API Key
     - Save

2. **Import Workflows**
   - Go to Workflows
   - Click "Import from JSON" or "Import from File"
   - Select or upload the workflow JSON files from the project repository:
     - `google-drive-trigger.json`
     - `document-import.json`
     - `document-processor.json`
     - `embedding-generator.json`

3. **Configure Workflow Variables**
   - Go to Settings > Variables
   - Add the following variables:
     - `GOOGLE_DRIVE_FOLDER_ID`: ID of the Google Drive folder to monitor
     - `SUPABASE_URL`: Your Supabase project URL
     - `EMBEDDING_MODEL`: Embedding model to use (e.g., "text-embedding-ada-002")

4. **Update Workflow Node Connections**
   - Open each workflow
   - Check that node connections reference the correct workflow IDs
   - Update any placeholder values with your specific configuration

5. **Activate Workflows**
   - Enable each workflow by toggling the "Active" switch

## Testing the Setup

1. **Test Google Drive Connection**
   - Upload a test document to your monitored Google Drive folder
   - Check the execution logs in n8n.cloud
   - Verify that the document appears in Supabase

2. **Test Document Processing**
   - Monitor the progress of the document through the pipeline
   - Check Supabase tables for document records
   - Verify that the document is processed and embedded

3. **Verify Vector Storage**
   - Check the `document_chunks` table in Supabase
   - Confirm that embeddings have been stored

## Troubleshooting

### Common Issues

1. **Google Drive Connection Fails**
   - Check that your OAuth credentials are correct
   - Verify that you've added the correct redirect URIs
   - Ensure the Google Drive API is enabled
   - Check that your OAuth consent screen is properly configured

2. **Supabase Connection Issues**
   - Verify your API key and URL
   - Check that tables are properly created
   - Ensure the vector extension is enabled
   - Verify storage bucket permissions

3. **Embedding Generation Fails**
   - Check your AI service API key
   - Verify the model name is correct
   - Check for rate limiting or quota issues
   - Ensure the document chunks are not too large

4. **Workflow Execution Issues**
   - Check execution logs in n8n.cloud
   - Verify all credentials are properly set up
   - Check that your n8n.cloud plan supports the workflow complexity
   - Verify webhook URLs are accessible if using webhooks

### Getting Help

If you encounter issues not covered here:

1. Check the project documentation
2. Search n8n forums at [community.n8n.io](https://community.n8n.io)
3. Open an issue on the project's GitHub repository
4. Check Supabase documentation at [supabase.com/docs](https://supabase.com/docs)
5. Visit the n8n.cloud support center

## Next Steps

Once your installation is complete, you can:

1. Customize the document processing logic
2. Implement the chat interface (MVP2)
3. Develop the webhook integration (Beta 1)
4. Extend the system with additional workflows

Refer to the project architecture and workflow documentation for detailed guidance on these next steps. 