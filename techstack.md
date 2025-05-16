# Document Management Application - Technology Stack

## Overview

This document outlines the technology stack used in our Document Management Application, which consists of a React frontend and Supabase backend. The application allows users to upload, view, and manage documents with metadata stored in a database and the actual files stored in Supabase Storage.

## Frontend Stack

### Core Technologies

- **React 19.1.0**: The latest version of React for building the user interface
- **TypeScript 5.8.3**: For type-safe development
- **Vite 6.3.5**: Modern build tool for faster development experience
- **React Router 7.6.0**: For client-side routing

### UI Frameworks & Styling

- **Tailwind CSS 4.1.7**: Utility-first CSS framework for styling
  - Custom configuration with extended color palette
  - Component abstractions using Tailwind's @layer directive
  - Responsive design utilities

### State Management

- **React Context API**: For global state management (authentication, etc.)

### Backend Integration

- **Supabase JS Client 2.49.4**: For interacting with Supabase backend services

### Development Tools

- **ESLint 9.25.0**: For code linting
- **TypeScript-ESLint 8.30.1**: TypeScript integration for ESLint
- **ESLint Plugins**: For React Hooks and React Refresh

## Backend Stack (Supabase)

### Core Services

- **Supabase**: Platform offering a suite of backend services:
  - **PostgreSQL Database**: For storing document metadata
  - **Authentication**: User management and authentication
  - **Storage**: For storing document files
  - **Edge Functions**: For server-side processing (planned)
  - **Row Level Security (RLS)**: For database access control

### Database Schema

- **documents**: Table for storing document metadata:
  - `id`: UUID primary key
  - `filename`: Original filename
  - `storage_path`: Path in Supabase Storage
  - `content_type`: MIME type of the document
  - `size_bytes`: File size in bytes
  - `created_by`: Foreign key to auth.users
  - `created_at`: Timestamp of upload
  - `updated_at`: Timestamp of last update
  - `description`: Optional description of the document
  - `content_hash`: Hash of file content for deduplication
  - `version`: Current version number
  - `is_latest`: Boolean flag for latest version
  - `jurisdiction`: State/territory or "National"
  - `county`: County name (if applicable)
  - `document_type`: Document category (Real Estate Law, etc.)

- **document_versions**: Table for tracking document version history:
  - `id`: UUID primary key
  - `document_id`: Reference to parent document
  - `version_number`: Sequential version number
  - `storage_path`: Path to archived version
  - `created_at`: Version creation timestamp
  - `created_by`: User who created the version
  - `expiry_date`: Calculated 5-year retention date

### Storage Configuration

- **Documents Bucket**: For storing current document versions
- **Archive Bucket**: For storing previous document versions

### Edge Functions

- **document-processing**: Extracts metadata from uploaded documents
- **document-validation**: Validates document integrity and checks for duplicates
- **document-versioning**: Handles document replacement and version management (planned)

## Document Management Features

### Deduplication System

- **Content Hashing**: SHA-256 for generating unique document fingerprints
- **Duplicate Detection**: Server-side comparison of file hashes
- **Strict Validation**: No duplicates permitted under any circumstances
- **Error Handling**: Clear user feedback for duplicate upload attempts

### Versioning & Archiving

- **Version Control**: System for tracking document revisions
- **Update Interface**: Document-specific update functionality
- **Archiving Strategy**: Automated storage of previous versions
- **Retention Policy**: 5-year retention period with automated cleanup
- **Version Access**: UI components for accessing document history

### Metadata Tagging System

- **Jurisdiction Tag**: Dropdown component with all US states/territories and "National"
- **County Tag**: Dynamic dropdown with counties based on selected state
- **Document Type Tag**: Categorization system for legal documents:
  - Real Estate Law
  - Title and Escrow Law
  - Tax Law
  - Regulation
- **Search & Filter**: Advanced filtering capabilities using metadata tags

## Development & Deployment

### Development Environment

- **Git**: For version control with branch-based workflow
- **npm**: For package management
- **Node.js**: Runtime environment for development tools

### Codebase Structure

The frontend codebase follows a modular architecture:

- **pages/**: Page components for each route
- **components/**: Reusable UI components
- **services/**: API and service integrations
- **hooks/**: Custom React hooks
- **layouts/**: Page layout components
- **types/**: TypeScript type definitions
- **assets/**: Static assets and resources

## UI Framework Migration

The application has successfully completed the UI framework migration:

- **From**: Chakra UI component library
- **To**: Tailwind CSS utility-first approach

### Migration Benefits

- **Smaller Bundle Size**: Removal of Chakra UI, Emotion, and Framer Motion dependencies
- **Improved Performance**: Tailwind's utility-first approach eliminates unused CSS
- **Better Developer Experience**: Direct styling in templates improves development workflow
- **Simplified Codebase**: Reduced reliance on third-party component libraries

## Future Enhancements

- **Access Control Roles**: Role-based permissions for document management
- **Full-text Search**: For document content indexing
- **Advanced Filtering**: Enhanced metadata-based search capabilities
- **Collaboration Features**: For document sharing and collaborative editing 