# Document Management Application

A modern document management system built with React and Supabase, designed specifically for AI-powered legal document research and compliance applications using RAG (Retrieval-Augmented Generation) techniques.

## 🎯 Purpose

This application serves as a specialized repository for legal documents including laws, compliance requirements, and regulations. It ensures document uniqueness through content-based deduplication and provides structured metadata tagging to support AI agents in legal research and compliance workflows.

## ✨ Features

### Core Document Management
- **Document Upload** with drag-and-drop interface
- **Strict Deduplication** using SHA-256 content hashing
- **Document Versioning** with 5-year retention policy
- **Metadata Tagging** for jurisdiction, county, and document type
- **Advanced Search & Filtering** by metadata tags

### Legal Document Specialization
- **Jurisdiction Tagging**: US states/territories + National level
- **County-specific** organization within jurisdictions
- **Document Type Classification**: Real Estate Law, Title & Escrow Law, Tax Law, Regulations
- **Version Control** for tracking legal document changes over time

### Security & Authentication
- **Supabase Authentication** with email/password
- **Row Level Security** for document access control
- **JWT-secured Edge Functions** for server-side processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd n8n-workflow-test
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Edit .env.local with your Supabase credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Set up Supabase backend**
   ```bash
   # Navigate to project root
   cd ..
   
   # Initialize Supabase (if not already done)
   supabase init
   
   # Run migrations
   supabase db reset
   
   # Deploy Edge Functions
   supabase functions deploy document-validation
   supabase functions deploy document-processing
   ```

5. **Start development server**
   ```bash
   cd frontend
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## 🏗️ Architecture

### Frontend Stack
- **React 19.1.0** with TypeScript
- **Vite 6.3.5** for build tooling
- **Tailwind CSS 4.1.7** for styling
- **React Router 7.6.0** for navigation
- **Supabase JS Client** for backend integration

### Backend Stack (Supabase)
- **PostgreSQL** database with Row Level Security
- **Supabase Storage** for document files
- **Edge Functions** for server-side processing
- **Authentication** for user management

### Database Schema
- `documents` table: Document metadata with content hashing
- `document_versions` table: Version history tracking
- Storage buckets: `documents` (current) and `archive` (versions)

## 📁 Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and service integrations
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Page layouts
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── supabase/                # Supabase backend configuration
│   ├── functions/           # Edge Functions
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase configuration
├── docs/                    # Additional documentation
├── README.md               # This file
├── CONTRIBUTING.md         # Development guidelines
└── CHANGELOG.md           # Version history
```

## 🔧 Development

### Available Scripts

```bash
# Frontend development
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Supabase operations
supabase start       # Start local Supabase
supabase db reset    # Reset database with migrations
supabase functions deploy <function-name>  # Deploy Edge Function
```

### Key Development Workflows

1. **Document Upload Flow**
   - Client uploads to temp storage
   - Edge Function validates and checks for duplicates
   - On success, moves to permanent storage with metadata

2. **Document Versioning**
   - Users update existing documents via "Update" button
   - Previous versions archived with 5-year retention
   - Version history accessible through document details

3. **Metadata Management**
   - Structured tagging during upload
   - Dynamic county selection based on jurisdiction
   - Filtering and search by metadata tags

## 🔒 Security

- **Authentication**: Email/password via Supabase Auth
- **Authorization**: Row Level Security policies
- **File Validation**: Type and size restrictions
- **Deduplication**: Content-based duplicate prevention
- **CORS**: Properly configured for security

## 🧪 Testing

### Running Tests
```bash
cd frontend
npm test             # Run unit tests
npm run test:e2e     # Run end-to-end tests (coming soon)
```

### Testing Edge Functions
```bash
# Test document validation
curl -X POST https://your-project.supabase.co/functions/v1/document-validation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "test-file", "userId": "user-id"}'
```

## 📚 Documentation

- **[Technical Architecture](./approach.md)** - Design decisions and system architecture
- **[Technology Stack](./techstack.md)** - Detailed technology choices and dependencies
- **[Edge Functions Guide](./edgefunctions.md)** - Implementation patterns and best practices
- **[Task Management](./tasklist.md)** - Development progress and task tracking
- **[Contributing Guidelines](./CONTRIBUTING.md)** - Development workflow and standards

## 🚀 Deployment

### Production Deployment
1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to hosting platform** (Vercel, Netlify, etc.)
   - Set environment variables
   - Configure build settings
   - Deploy from `frontend/dist`

3. **Configure Supabase for production**
   - Update RLS policies
   - Set up proper authentication
   - Configure storage permissions

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our development process, coding standards, and how to submit contributions.

## 📋 Current Status

### ✅ Completed Features
- Basic authentication and user management
- Document upload with drag-and-drop interface
- Document listing with basic metadata
- UI migration from Chakra UI to Tailwind CSS
- Database schema with versioning support
- Edge Functions for document processing

### 🚧 In Development
- Document deduplication implementation
- Document versioning UI and workflow
- Metadata tagging system
- Advanced search and filtering

### 📅 Upcoming Features
- Document preview functionality
- Mobile responsive design
- Access control roles
- Full-text search capabilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, issues, or contributions:
- Create an issue in the GitHub repository
- Refer to the documentation in the `docs/` directory
- Check the [troubleshooting guide](./edgefunctions.md) for common issues

---

**Built with ❤️ for legal professionals and AI-powered document research** 