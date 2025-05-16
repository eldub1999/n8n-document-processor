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

### Storage Configuration

- **Documents Bucket**: For storing uploaded files with proper access controls

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

- **Edge Functions**: For document processing and advanced search capabilities
- **Full-text Search**: For document content indexing
- **Version Control**: For tracking document versions and changes
- **Collaboration Features**: For document sharing and collaborative editing 