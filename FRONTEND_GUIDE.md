# Frontend Development Guide

This guide provides detailed information for frontend development of the Legal Document Management System, built with React, TypeScript, Vite, and Tailwind CSS.

## 1. Overview

The frontend application provides the user interface for document upload, management, and interaction with the RAG-powered chat system. It communicates with the Supabase backend using the Supabase JS client library.

Refer to `ARCHITECTURE.md` for the overall system architecture and how the frontend interacts with backend components.

## 2. Technology Stack

*   **Core Framework:** React 19.1.0
*   **Language:** TypeScript 5.8.3
*   **Build Tool:** Vite 6.3.5
*   **Routing:** React Router 7.6.0
*   **Styling:** Tailwind CSS 4.1.7
*   **Backend Client:** Supabase JS Client 2.49.4
*   **Linting:** ESLint 9.25.0 with TypeScript-ESLint 8.30.1 and relevant React plugins.

## 3. Project Structure

The `frontend/src/` directory is organized as follows (illustrative, based on common patterns and `README.md`):

```
frontend/
├── public/                  # Static assets directly served
├── src/
│   ├── assets/              # Images, fonts, etc., imported by components
│   │   ├── common/          # Generic components (Button, Input, Modal, etc.)
│   │   ├── layout/          # Layout components (Navbar, Sidebar, PageWrapper, etc.)
│   │   └── features/        # Feature-specific components (e.g., DocumentUpload, ChatWindow)
│   ├── contexts/            # React Context providers (e.g., AuthContext, ThemeContext)
│   ├── hooks/               # Custom React hooks (e.g., useAuth, useDebounce)
│   ├── layouts/             # Top-level page layouts (e.g., MainLayout, AuthLayout)
│   ├── pages/               # Route-level components (e.g., HomePage, DocumentListPage, ChatPage)
│   ├── services/            # Modules for interacting with backend APIs (Supabase client wrappers)
│   │   ├── authService.ts
│   │   ├── documentService.ts
│   │   └── ragService.ts
│   ├── styles/              # Global styles, Tailwind base/component customizations
│   │   └── global.css
│   ├── types/               # TypeScript type definitions and interfaces
│   │   ├── domain.ts        # Core application types (Document, User, etc.)
│   │   └── api.ts           # Types for API request/response payloads
│   ├── utils/               # Utility functions (date formatters, validators, etc.)
│   ├── App.tsx              # Main application component (routing setup)
│   ├── main.tsx             # Entry point of the application
│   └── vite-env.d.ts        # Vite environment types
├── .env.local               # Local environment variables (Supabase URL/keys)
├── .env.example             # Example environment file
├── index.html               # Main HTML entry point for Vite
├── package.json
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration (for Tailwind)
└── vite.config.ts           # Vite build configuration
```

## 4. Component Structure & Philosophy

*   **Functional Components:** Exclusively use functional components with React Hooks.
*   **Modularity:** Break down complex UIs into smaller, reusable components.
*   **Presentational vs. Container Components (Conceptual):** While not strictly enforced, aim for a separation where some components are primarily for display (`presentational`) and others manage logic and state (`container`), often utilizing custom hooks.
*   **Naming Conventions:** PascalCase for component files and component names (e.g., `DocumentList.tsx`, `DocumentList`).
*   **Props:**
    *   Define props using TypeScript interfaces.
    *   Props should be camelCase.
    *   Provide default values for optional props where sensible.

## 5. State Management

*   **Local Component State:** Use `useState` and `useReducer` for state confined to a single component or a small, closely-related group of components.
*   **Global State (React Context API):** For state that needs to be shared across many components or different parts of the application (e.g., user authentication status, user profile, theme settings).
    *   Define contexts in the `src/contexts/` directory.
    *   Create custom hooks (e.g., `useAuth()`) to provide easy access to context values and dispatch functions, abstracting away direct `useContext` calls in consumer components.
    *   Avoid overusing Context for all state; consider if prop drilling or component composition is more appropriate for intermediate cases.
*   **Server Cache State Management:** While not explicitly detailed as implemented, libraries like React Query (TanStack Query) or SWR are commonly used for managing server state (fetching, caching, synchronization, and updates of data from the backend). If not yet in use, consider for future enhancements to simplify data fetching logic and improve UX with caching, optimistic updates, etc.

## 6. Styling (Tailwind CSS)

*   **Utility-First:** Embrace Tailwind's utility-first approach for styling directly in your JSX/TSX.
*   **`tailwind.config.js`:** Customize Tailwind's default theme (colors, spacing, fonts, breakpoints) to match project design requirements.
    ```javascript
    // Example tailwind.config.js excerpt
    module.exports = {
      content: ["./src/**/*.{js,jsx,ts,tsx}"],
      theme: {
        extend: {
          colors: {
            primary: 'var(--color-primary)', // Using CSS variables for theming
            // ... other custom colors
          },
        },
      },
      plugins: [],
    };
    ```
*   **Global Styles (`src/styles/global.css`):**
    *   Import Tailwind's base, components, and utilities:
        ```css
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
        ```
    *   Define base styles for HTML elements (e.g., body, headings) if needed.
    *   Define custom global CSS variables here (e.g., for theming colors referenced in `tailwind.config.js`).
*   **Component-Specific Styles:**
    *   Primarily use utility classes.
    *   For complex, reusable component patterns, you can use Tailwind's `@apply` directive within `global.css` or a component-specific CSS module, but use this sparingly to maintain the utility-first benefits.
        ```css
        /* In global.css or a CSS module */
        .btn-primary {
          @apply py-2 px-4 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-dark;
        }
        ```
*   **Responsive Design:** Use Tailwind's responsive prefixes (e.g., `sm:`, `md:`, `lg:`) to create adaptive layouts.

## 7. Key UI Workflows

This section should detail the frontend logic and component interactions for major user flows.

### a. User Authentication

*   **Pages:** `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`.
*   **Service:** `authService.ts` (wraps Supabase Auth client calls like `signInWithPassword`, `signUp`, `signOut`, `onAuthStateChange`).
*   **Context:** `AuthContext` manages user state, loading status, and provides auth functions to components.
*   **Protected Routes:** Use a wrapper component or logic within React Router to redirect unauthenticated users from protected pages.

### b. Document Upload

*   **Component:** `DocumentUpload.tsx` (likely in `src/components/features/`)
*   **Service:** `documentService.ts` (handles file upload to Supabase Storage, possibly in chunks, and invokes the `document-validation` Edge Function).
*   **Steps:**
    1.  User selects file(s) (drag-and-drop, file input).
    2.  Client-side validation (file type, size limits).
    3.  User provides metadata (jurisdiction, county, document type).
    4.  File is uploaded to `temp-uploads` bucket in Supabase Storage (often via `supabase.storage.from('temp-uploads').upload(...)`).
    5.  Frontend calls the `document-validation` Edge Function with file details and metadata.
    6.  UI provides feedback on upload progress and validation status (success, error, duplicate detected).
    7.  Upon successful validation, the document list might refresh or indicate the new document is processing.

### c. Document Listing & Management

*   **Page:** `DocumentListPage.tsx`
*   **Component:** `DocumentList.tsx`, `DocumentListItem.tsx`, `FilterControls.tsx`.
*   **Service:** `documentService.ts` (fetches documents from the `documents` table with filters and pagination).
*   **Features:**
    *   Display list of documents with key metadata.
    *   Filtering by jurisdiction, county, document_type.
    *   Sorting.
    *   Pagination.
    *   Actions per document (view details, update (versioning), delete - permissions permitting).

### d. Chat Interface

*   **Page:** `ChatPage.tsx`
*   **Component:** `ChatWindow.tsx`, `MessageList.tsx`, `MessageInput.tsx`.
*   **Service:** `ragService.ts` (sends user queries to `rag-chat` Edge Function, manages conversation history with Supabase).
*   **Features:**
    *   Display conversation history.
    *   Input for user queries.
    *   (Optional) Filters for metadata to narrow RAG context.
    *   Handles streaming responses if implemented by the Edge Function.
    *   Displays AI-generated responses, potentially with source attribution.

## 8. Interaction with Backend Services (Supabase JS Client)

*   **Initialization:** The Supabase client is initialized once with the project URL and anon key (typically in `services/supabaseClient.ts` or similar).
*   **Authentication:** Use `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()`, `supabase.auth.signOut()`, `supabase.auth.onAuthStateChange()`.
*   **Database Operations:**
    *   Fetching data: `supabase.from('documents').select('*').eq('jurisdiction', 'California')`.
    *   Inserting data: `supabase.from('chat_messages').insert({ ... })`.
    *   Updating/Deleting: `supabase.from('documents').update({ ... }).eq('id', docId)`.
*   **Storage Operations:**
    *   Uploading: `supabase.storage.from('temp-uploads').upload(filePath, file)`.
    *   Downloading: `supabase.storage.from('documents').download(filePath)`.
    *   Getting public URLs (if applicable): `supabase.storage.from('public-bucket').getPublicUrl(filePath)`.
*   **Edge Function Invocation:**
    *   `supabase.functions.invoke('function-name', { body: { ... } })`.
    *   Handle responses and errors from function invocations.
*   **Realtime Subscriptions (if used):** `supabase.channel(...).on(...).subscribe()` for listening to database changes (e.g., live chat updates, processing status updates).

## 9. Environment Variables

*   Key Supabase credentials are stored in `.env.local` (and managed securely for deployment environments):
    *   `VITE_SUPABASE_URL`: Your Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase project anon key.
*   These are accessed in the frontend code via `import.meta.env.VITE_SUPABASE_URL`.

## 10. Testing

*   **Unit Tests:** (Planned/To be implemented) Use a framework like Vitest or Jest with React Testing Library to test individual components and hooks.
    *   Focus on testing component rendering based on props, user interactions, and state changes.
    *   Mock Supabase client calls for service/hook tests.
*   **Integration Tests:** (Planned/To be implemented) Test interactions between multiple components or a component and its services/contexts.
*   **End-to-End (E2E) Tests:** (Planned/To be implemented) Use tools like Playwright or Cypress to test full user flows through the application in a browser environment.
    *   `npm run test:e2e` script mentioned in `README.md` (coming soon).

*(This guide should be kept up-to-date with frontend development practices and architectural changes.)* 