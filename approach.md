# Document Management Application - Approach & Design Decisions

## Project Overview

The goal is to create a simple document management application with a React frontend and Supabase backend. The application will allow users to upload, view, and manage documents, with metadata stored in a database and the actual files stored in Supabase Storage.

## Architecture Approach

### Frontend

We'll build the frontend using React with the following considerations:

1. **Framework Choice**: Using Vite for faster development experience and better performance compared to Create React App
2. **State Management**: Leveraging React's built-in Context API for simpler state management needs rather than introducing Redux complexity
3. **UI Design**: Using a component-based approach with responsive design principles
4. **API Communication**: Using the Supabase JavaScript client for direct communication with Supabase services
5. **UI Framework**: Migrating from Chakra UI to Tailwind CSS for better performance, flexibility, and reduced bundle size

### Backend

We'll leverage Supabase as a complete backend solution with these components:

1. **Authentication**: Supabase Auth for user management
2. **Database**: Postgres database through Supabase for storing document metadata
3. **File Storage**: Supabase Storage for document files
4. **Server Logic**: Supabase Edge Functions for server-side processing needs

## Design Decisions

### Document Storage Strategy

Instead of storing files directly in the database, we'll use a hybrid approach:
- Store files in Supabase Storage for efficient delivery and management
- Store metadata in a dedicated database table for fast querying
- Link the two with proper foreign key relationships

This approach provides better performance and scalability compared to storing files directly in the database.

### Document Deduplication Strategy

To ensure each document in the system is unique:
- We'll implement a hash-based deduplication system using file content hashing
- During upload, the document hash will be calculated and compared against existing documents
- If a duplicate is detected, users will be notified with an error message
- Duplicates are strictly forbidden under any circumstances
- This approach ensures knowledge integrity for the RAG-based AI system

### Document Versioning and Archiving

To support document updates while preserving history:
- Users must first locate the existing document in the document list
- An "Update" button will be available for each document
- When a document is updated, the previous version will be:
  - Moved to an archive storage location
  - Linked to the current version through a version chain
  - Retained for a 5-year period per policy requirements
- Users can access version history to view or restore previous versions
- Metadata will track version numbers, creation dates, and modification details
- This approach maintains historical records of legal document changes

### Metadata Tagging System

To facilitate document organization and filtering:
- Three primary metadata tags will be implemented:
  1. **Jurisdiction Tag**: Dropdown with all US states/territories and a "National" option
  2. **County Tag**: Dropdown with counties for the selected state (disabled for "National")
  3. **Document Type Tag**: Categorizes documents as Real Estate Law, Title and Escrow Law, Tax Law, or Regulation
- These tags will support the RAG implementation by providing structured filtering capabilities
- Additional metadata fields may be implemented in the future based on user needs

### Database Schema

We'll create a `documents` table with the following structure:
- `id`: UUID primary key
- `filename`: Original filename
- `storage_path`: Path in Supabase Storage
- `content_type`: MIME type of the document
- `size_bytes`: File size in bytes
- `created_by`: Foreign key to auth.users
- `created_at`: Timestamp of upload
- `updated_at`: Timestamp of last update
- `description`: Optional description of the document
- `content_hash`: Hash of the document content for deduplication
- `version`: Current version number of the document
- `is_latest`: Boolean flag indicating if this is the latest version
- `jurisdiction`: State/territory or "National"
- `county`: County name (if applicable)
- `document_type`: Category of document (Real Estate Law, etc.)

A complementary `document_versions` table will track version history:
- `id`: UUID primary key
- `document_id`: Reference to the main document
- `version_number`: Sequential version number
- `storage_path`: Path to the archived version in storage
- `created_at`: When this version was created
- `created_by`: Who created this version
- `expiry_date`: When this archived version can be removed (5 years after creation)

This schema allows us to efficiently query documents, while maintaining a clean separation between metadata and file storage.

### Security Model

We'll implement a security model using Supabase Row Level Security (RLS) policies:
1. **Public Documents**: All authenticated users can view documents
2. **Private User Documents**: Users can only manage (update/delete) documents they've created
3. **Admin Access**: Admin users can manage all documents

A future implementation will include more granular access control roles for document management.

### Edge Functions Strategy

We'll use Supabase Edge Functions for operations that require server-side processing:
1. **Document Processing**: Extract metadata from uploaded documents
2. **Search Functionality**: Implement complex search logic beyond what can be done client-side
3. **Authorization Checks**: Additional security validations beyond RLS
4. **Notifications**: Send email notifications for document updates (future enhancement)
5. **Deduplication**: Detect duplicate documents during upload process
6. **Versioning**: Manage document versions and archiving

Using Edge Functions allows us to keep sensitive business logic on the server while maintaining a serverless architecture.

### User Experience Considerations

1. **Upload Process**: 
   - Support for drag-and-drop uploads
   - Progress indicators for large files
   - Client-side validation before upload
   - Duplicate detection and error notifications

2. **Document Management**:
   - Intuitive list view with sorting and filtering based on metadata tags
   - Preview functionality for common file types
   - Batch operations for efficiency
   - Version history access and management
   - Update button for creating new versions of existing documents

3. **Responsive Design**:
   - Mobile-friendly interface
   - Adaptive layouts for different screen sizes

### UI Framework Migration

We decided to migrate from Chakra UI to Tailwind CSS for the following reasons:

1. **Performance**: Tailwind CSS offers better runtime performance due to its utility-first approach
2. **Bundle Size**: Smaller bundle size compared to component libraries like Chakra UI
3. **Flexibility**: More granular control over styling without fighting against pre-built component styles
4. **Developer Experience**: Faster iteration with inline utility classes
5. **Modern Approach**: Aligns with current industry trends for frontend styling

The migration strategy involves:
- Incremental conversion of components to maintain application stability
- Creating Tailwind equivalents of commonly used Chakra UI patterns
- Building a consistent theme using Tailwind's configuration
- Testing thoroughly throughout the migration process

## Technical Constraints & Considerations

1. **File Size Limits**: Implement chunked uploads for files larger than 6MB (Supabase recommendation)
2. **Security**: Implement proper CORS settings and validate file types to prevent security vulnerabilities
3. **Performance**: Optimize for both upload and retrieval efficiency
4. **Cost Efficiency**: Design with Supabase pricing tiers in mind to optimize for cost
5. **Storage Management**: Implement automated cleanup for archived versions past retention period

## Future Enhancements

1. **Access Control Roles**: Implement role-based access control for document management
2. **Collaboration**: Allow sharing and collaborative editing
3. **Advanced Search**: Full-text search across document content
4. **Integration**: Connect with third-party services for document sourcing
5. **Advanced Metadata**: Expand metadata tagging system as needs evolve