# Environment Variables Guide for n8n.cloud

This document provides guidance on setting up the required environment variables (workflow variables) in n8n.cloud for the document processing workflow.

## Overview

n8n.cloud uses a variable system that allows you to define values that can be accessed across your workflows. This is where we'll store configuration settings, API keys, and other sensitive information needed by our workflows.

## Required Variables

The following variables should be set up in your n8n.cloud workspace:

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `GOOGLE_DRIVE_FOLDER_ID` | ID of the Google Drive folder to monitor | `1aBcDeFgHiJkLmNoPqRsTuVwXyZ` |
| `SUPABASE_URL` | URL of your Supabase project | `https://abcdefghijklm.supabase.co` |
| `SUPABASE_API_KEY` | Supabase service role API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `EMBEDDING_MODEL` | Name of the embedding model to use | `text-embedding-ada-002` |
| `OPENAI_API_HOST` | Host URL for OpenAI API (if needed) | `https://api.openai.com/v1` |
| `N8N_WEBHOOK_BASE_URL` | Base URL for n8n webhooks (set automatically) | `https://your-name.app.n8n.cloud/webhook/` |

## Setting Up Variables in n8n.cloud

1. **Navigate to Variables**
   - Log in to your n8n.cloud workspace
   - Click on "Settings" in the left sidebar
   - Select "Variables"

2. **Create a New Variable**
   - Click "Add Variable"
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the variable value
   - Select appropriate options:
     - **Type**: Usually "String" for most variables
     - **Scope**: "Workflow" for variables used across multiple workflows
   - Click "Save"

3. **Using Variables in Workflows**
   - Within nodes, you can access variables using the following syntax:
   - `{{$vars.VARIABLE_NAME}}` for string variables
   - Example: `{{$vars.SUPABASE_URL}}`

## Security Considerations

- Always use variables for sensitive information like API keys
- Never hardcode sensitive values in workflow nodes
- Use the credentials manager for API authentication when possible
- For highest security, mark sensitive variables as non-readable after setting them

## Variables for Different Environments

If you have multiple environments (development, staging, production), consider using a naming convention for your variables:

- `DEV_SUPABASE_URL` for development
- `PROD_SUPABASE_URL` for production

Then use logic in your workflows to select the appropriate variable.

## Finding Variable Values

### Google Drive Folder ID
1. Navigate to the folder in Google Drive
2. The ID is the alphanumeric string in the URL after "folders/"
   - Example: `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
   - Folder ID is `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`

### Supabase URL and API Key
1. Go to your Supabase project dashboard
2. Click on "Project Settings" > "API"
3. Your project URL is shown at the top
4. Under "Project API keys," copy the "service_role" key (not the anon key)

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy the key immediately (it won't be shown again) 