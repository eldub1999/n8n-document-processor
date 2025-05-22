# Contributing to Document Management Application

We welcome contributions to make this legal document management system better! This guide will help you understand our development process and how to contribute effectively.

## 🎯 Project Vision

This application serves as a specialized repository for legal documents, designed to support AI-powered research and compliance workflows. All contributions should align with this purpose, emphasizing document integrity, legal workflow efficiency, and AI/RAG compatibility.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git for version control
- Supabase account for backend services
- Basic understanding of React, TypeScript, and PostgreSQL

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/n8n-workflow-test.git
   cd n8n-workflow-test
   ```

2. **Set up the development environment**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Set up environment variables
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Initialize Supabase backend**
   ```bash
   cd ..
   supabase start
   supabase db reset
   ```

4. **Start development server**
   ```bash
   cd frontend
   npm run dev
   ```

## 🌳 Branching Strategy

We follow a structured Git workflow to maintain code quality and project organization:

### Core Branches

- **`main`**: Production-ready code
  - Always stable and deployable
  - Only receives merges from `develop` or `hotfix/*` branches via Pull Requests
  - No direct commits allowed

- **`develop`**: Primary integration branch
  - Contains latest development features
  - All feature branches merge here first
  - Regular testing and integration happens here

### Feature Branches

- **Naming Convention**: `feature/[task-id]-[description]`
  - Examples: `feature/FE-101-document-upload`, `feature/BE-205-metadata-tagging`
  - Always branch from latest `develop`
  - Keep focused on a single feature or fix

- **Hotfix Branches**: `hotfix/[description]`
  - Only for urgent production fixes
  - Branch from `main`
  - Must be merged to both `main` AND `develop`

### Development Workflow

1. **Start new work**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Regular development**
   ```bash
   # Make changes
   git add .
   git commit -m "feat(component): add feature description"
   ```

3. **Before creating PR**
   ```bash
   # Sync with latest develop
   git fetch origin develop
   git merge origin/develop
   # Resolve any conflicts
   ```

4. **Create Pull Request**
   - Target: `develop` branch
   - Use clear title and description
   - Reference related issues/tasks

## 📝 Commit Message Standards

We use conventional commits for clear history and automated changelog generation:

### Format
```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

### Examples
```bash
feat(upload): add drag-and-drop document upload
fix(auth): resolve JWT token validation issue
docs(readme): update installation instructions
refactor(components): extract reusable form components
test(deduplication): add unit tests for hash comparison
```

### Scope Guidelines
- `auth`: Authentication and authorization
- `upload`: Document upload functionality
- `dedup`: Deduplication system
- `version`: Document versioning
- `metadata`: Metadata tagging and filtering
- `ui`: User interface components
- `db`: Database schema and migrations
- `edge`: Edge Functions
- `config`: Configuration and setup

## 🏗️ Code Standards

### TypeScript Guidelines

- **Strict Mode**: Enable strict TypeScript checking
- **Type Definitions**: Always define proper types, avoid `any`
- **Interfaces**: Use interfaces for object structures
- **Enums**: Use enums for predefined constants

```typescript
// Good
interface DocumentMetadata {
  jurisdiction: string;
  county?: string;
  documentType: DocumentType;
}

enum DocumentType {
  REAL_ESTATE_LAW = 'Real Estate Law',
  TITLE_ESCROW_LAW = 'Title and Escrow Law',
  TAX_LAW = 'Tax Law',
  REGULATION = 'Regulation'
}

// Avoid
const metadata: any = { /* ... */ };
```

### React Component Standards

- **Functional Components**: Use function components with hooks
- **Component Naming**: PascalCase for components, camelCase for props
- **Props Interface**: Always define props interface
- **Hooks**: Follow React hooks rules and best practices

```typescript
interface DocumentListProps {
  documents: Document[];
  onDocumentSelect: (id: string) => void;
  loading?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentSelect,
  loading = false
}) => {
  // Component implementation
};
```

### Styling Guidelines

- **Tailwind CSS**: Use utility-first approach
- **Component Styling**: Create reusable component classes
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Include proper ARIA labels and semantic HTML

```typescript
// Good - Tailwind utilities with component abstraction
const buttonClasses = cn(
  "px-4 py-2 rounded-md font-medium transition-colors",
  "hover:bg-blue-600 focus:outline-none focus:ring-2",
  variant === 'primary' ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
);
```

### Database and API Standards

- **Migration Naming**: Descriptive sequential naming
- **SQL Style**: Consistent formatting and naming
- **Edge Functions**: Follow security and performance best practices
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🧪 Testing Requirements

### Unit Tests
- **Coverage**: Aim for 80%+ test coverage
- **Test Files**: Co-locate tests with components (`ComponentName.test.tsx`)
- **Testing Library**: Use React Testing Library for component tests
- **Mocking**: Mock external dependencies and API calls

```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentUpload } from './DocumentUpload';

describe('DocumentUpload', () => {
  it('should handle file drop correctly', () => {
    const mockOnUpload = jest.fn();
    render(<DocumentUpload onUpload={mockOnUpload} />);
    
    // Test implementation
  });
});
```

### Integration Tests
- **API Endpoints**: Test Edge Functions with realistic data
- **Database Operations**: Test database queries and migrations
- **File Operations**: Test document upload/download workflows

### Manual Testing Checklist
Before submitting PR, verify:
- [ ] Authentication flows work correctly
- [ ] Document upload handles various file types
- [ ] Deduplication prevents duplicate uploads
- [ ] Metadata filtering functions properly
- [ ] Mobile responsive design works
- [ ] Error states display appropriate messages

## 🔄 Pull Request Process

### PR Requirements

1. **Clear Title and Description**
   - Use conventional commit format for title
   - Describe what changes were made and why
   - Reference related issues or tasks

2. **Code Quality Checks**
   - All tests pass
   - ESLint checks pass
   - TypeScript compilation succeeds
   - No console errors in development

3. **Documentation Updates**
   - Update relevant documentation
   - Add/update code comments for complex logic
   - Update task list if completing features

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Integration tests pass

## Related Issues
Closes #123

## Screenshots (if applicable)
Add screenshots for UI changes
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: At least one team member reviews
3. **Testing**: Reviewer tests functionality manually
4. **Approval**: PR approved and merged to `develop`

## 🏛️ Legal Document Context

When contributing, keep in mind the specialized nature of this application:

### Document Types
- Laws and statutes
- Compliance requirements
- Regulations and policies
- Legal precedents

### Key Principles
- **Document Integrity**: No duplicate documents allowed
- **Version Control**: Track all document changes
- **Metadata Accuracy**: Proper jurisdiction and classification
- **Search Optimization**: Support AI/RAG document retrieval

## 🔒 Security Considerations

### Authentication
- Never commit credentials or API keys
- Test authentication flows thoroughly
- Follow Supabase security best practices

### Data Protection
- Validate all user inputs
- Sanitize file uploads
- Implement proper access controls
- Follow GDPR/privacy guidelines where applicable

### Edge Functions
- Validate JWT tokens properly
- Implement rate limiting
- Log security events
- Handle errors gracefully

## 📚 Resources

### Documentation
- [Project README](./README.md)
- [Technical Architecture](./approach.md)
- [Technology Stack](./techstack.md)
- [Edge Functions Guide](./edgefunctions.md)

### External Resources
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Community

### Getting Help
- Create an issue for bugs or feature requests
- Join project discussions
- Ask questions in PR comments
- Refer to existing documentation

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the project's legal document management goals

## 📋 Issue Reporting

### Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, etc.)
- Screenshots or error messages

### Feature Requests
Include:
- Clear description of the feature
- Use case and business value
- Proposed implementation approach
- Impact on existing functionality

---

Thank you for contributing to the Document Management Application! Your contributions help create better tools for legal professionals and AI-powered research workflows. 