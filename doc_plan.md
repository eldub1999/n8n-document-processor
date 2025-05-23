# Documentation Refactoring Plan

## Goal

To refactor the existing Markdown documentation into a clear, concise, and well-structured set of documents that allows any AI or human coder to quickly understand the project's conventions, architecture, APIs, and workflows. This plan also includes the creation of a `document_index.md` to serve as a master guide.

## Phase 1: Analysis and Information Audit (Completed by AI)

1.  **Content Review (Done):**
    *   `README.md`: Entry point, setup, project structure, basic workflows.
    *   `edgefunctions.md`: Detailed list of Edge Functions, their status, purpose, and planned cleanup. Contains valuable specifics about core functions.
    *   `CODE_REVIEW_ISSUES.md`: Historical code review findings, many of which relate to Edge Function redundancy and processing pipeline issues. Some architectural insights.
    *   `WORKFLOW_ANALYSIS.md`: Compares proposed vs. current system workflows, identifies major gaps in document processing and RAG pipeline. Outlines future tasks.
    *   `techstack.md`: Lists frontend and backend technologies, database schema details, and feature descriptions (deduplication, versioning, metadata).
    *   `CONTRIBUTING.md`: Excellent, detailed guide on Git workflow, commit messages, code standards.
    *   `approach.md`: Design decisions, architecture, security model, UI/UX considerations. Good overlap with `techstack.md` but more focused on the "why".
    *   `CHANGELOG.md`: Standard changelog format.
    *   `tasklist.md`: Dynamic operational task list, contains current system status, issues, and future plans. Some elements (like core function descriptions) could be extracted to permanent docs.

2.  **Key Themes & Findings:**
    *   **Strong Git/Contribution Guidelines:** `CONTRIBUTING.md` is comprehensive.
    *   **Redundancy:** Information about Edge Functions, database schema, and architectural approach is scattered and duplicated across `techstack.md`, `approach.md`, `edgefunctions.md`, and even `CODE_REVIEW_ISSUES.md` and `WORKFLOW_ANALYSIS.md`.
    *   **Historical vs. Current Documentation:** Files like `CODE_REVIEW_ISSUES.md` and `WORKFLOW_ANALYSIS.md` contain valuable analysis but are largely historical or future-planning. Their core, *current* architectural implications need to be extracted.
    *   **`tasklist.md` Overload:** While excellent for dynamic tracking, `tasklist.md` also holds some descriptive information about system components (like Edge Functions) that should reside in more static documentation.
    *   **Gaps:** While much information exists, a single, consolidated "System Architecture" or "Backend Guide" is missing. Frontend architecture details are present but could be more focused.

## Phase 2: Design New Documentation Structure

1.  **Proposed Documentation Set:**

    *   **`README.md` (Keep & Refine)**
        *   **Purpose:** Main entry point. Quick project overview, what it does, and how to get it running locally.
        *   **Refinements:** Ensure it clearly links to `document_index.md` for deeper dives. Keep setup instructions concise.

    *   **`document_index.md` (New)**
        *   **Purpose:** Master table of contents for all project documentation. Enables quick navigation.
        *   **Content:** List of all key `.md` files, their purpose, and a brief summary of contents.

    *   **`ARCHITECTURE.md` (New - Consolidates `techstack.md`, `approach.md`, parts of `WORKFLOW_ANALYSIS.md`)**
        *   **Purpose:** Single source of truth for overall system architecture, design principles, and technology choices.
        *   **Key Contents:**
            *   High-level system overview diagram (if possible, text-based or linked).
            *   Core architectural patterns and principles.
            *   Frontend Architecture: Key libraries/frameworks, folder structure, state management, API communication.
            *   Backend Architecture: Supabase services utilized (Auth, DB, Storage, Functions), data models/schema (high-level, details in Backend Guide), interaction patterns.
            *   Key Design Decisions & Rationale (extracted from `approach.md`).
            *   Data flow for major processes (e.g., document ingestion, RAG query).

    *   **`BACKEND_GUIDE.md` (New - Consolidates `edgefunctions.md`, DB parts of `techstack.md`/`approach.md`)**
        *   **Purpose:** Detailed guide for backend development, focusing on Supabase.
        *   **Key Contents:**
            *   Database Schema: Detailed descriptions of tables, columns, relationships, RLS policies.
            *   Edge Functions:
                *   Overview of core, active functions (`document-processor`, `rag-chat`, `document-validation`).
                *   Purpose, triggers, key dependencies, JWT policies for each.
                *   Development patterns, shared code, error handling.
                *   Guidelines for adding/removing functions.
            *   Supabase Storage: Bucket structure, usage conventions.
            *   API Endpoints (if any beyond direct Supabase client usage).

    *   **`FRONTEND_GUIDE.md` (New - Extracted from `README.md`, `techstack.md`, `approach.md`)**
        *   **Purpose:** Detailed guide for frontend development.
        *   **Key Contents:**
            *   Component Structure & Philosophy.
            *   State Management Approach (React Context API details).
            *   Styling (Tailwind CSS setup, custom configurations, utility-first best practices).
            *   Key UI Workflows (e.g., Document Upload, Chat Interface).
            *   Interaction with Backend Services (Supabase JS Client usage patterns).
            *   Testing (Unit and E2E testing approach).

    *   **`CONTRIBUTING.md` (Keep & Link)**
        *   **Purpose:** Comprehensive guide for setting up, branching, committing, PRs, and code standards.
        *   **Refinements:** Ensure it's up-to-date. Link prominently from `README.md` and `document_index.md`.

    *   **`CHANGELOG.md` (Keep)**
        *   **Purpose:** Standard changelog.

    *   **`TASKLIST.md` (Keep - Operational)**
        *   **Purpose:** Dynamic task tracking, bug reports, current system status.
        *   **Refinements:** Strive to move any *permanent* descriptive information (e.g., detailed function descriptions once stable) out of here and into the appropriate static guides, linking to them if necessary.

    *   **Archived Documents (Potential):**
        *   `CODE_REVIEW_ISSUES.md`: Archive after extracting relevant architectural decisions/learnings.
        *   `WORKFLOW_ANALYSIS.md`: Archive after extracting relevant architectural decisions and proposed workflows into `ARCHITECTURE.md` or new feature proposals.
        *   The original `edgefunctions.md`, `techstack.md`, `approach.md` will be superseded by the new structure.

2.  **`document_index.md` Initial Outline:**

    ```markdown
    # Project Documentation Index

    This document serves as the central index for all documentation related to the Legal Document Management System.

    ## Core Documents

    *   **`README.md`**
        *   **Purpose:** Main entry point, project overview, and local setup instructions.
        *   **Contents:** Project goals, quick start, basic architecture, development scripts.
    *   **`CONTRIBUTING.md`**
        *   **Purpose:** Guidelines for contributing to the project.
        *   **Contents:** Git workflow, branch strategy, commit message standards, code style.
    *   **`CHANGELOG.md`**
        *   **Purpose:** Record of all notable changes made to the project.
        *   **Contents:** Version history, added/changed/fixed features.

    ## System Understanding & Development Guides

    *   **`ARCHITECTURE.md`**
        *   **Purpose:** Describes the overall system architecture, design principles, and technology stack.
        *   **Contents:** High-level overview, frontend/backend architecture, key design decisions, data flows.
    *   **`BACKEND_GUIDE.md`**
        *   **Purpose:** Detailed information for backend development, primarily focusing on Supabase.
        *   **Contents:** Database schema, Edge Function specifics, Supabase Storage conventions.
    *   **`FRONTEND_GUIDE.md`**
        *   **Purpose:** Detailed information for frontend development.
        *   **Contents:** Component structure, state management, styling, UI workflows, backend interaction.

    ## Operational & Dynamic Documents

    *   **`TASKLIST.md`**
        *   **Purpose:** Tracks ongoing development tasks, bugs, system status, and immediate next steps.
        *   **Contents:** Current operational state, active tasks, future plans.
    ```

## Phase 3: Implementation Plan (To be executed upon approval)

1.  **Branch Creation:**
    *   Create a new branch: `feature/docs-refactor` from `develop`.

2.  **Create `document_index.md`:**
    *   Create the initial `document_index.md` file with the structure defined above.

3.  **Develop `ARCHITECTURE.md`:**
    *   Create `ARCHITECTURE.md`.
    *   Consolidate relevant sections from `techstack.md` (overview, frontend/backend stack sections).
    *   Consolidate relevant sections from `approach.md` (architecture approach, design decisions).
    *   Extract high-level data flow and architectural insights from `WORKFLOW_ANALYSIS.md`.
    *   Write new content to bridge gaps and ensure a cohesive document.

4.  **Develop `BACKEND_GUIDE.md`:**
    *   Create `BACKEND_GUIDE.md`.
    *   Transfer detailed database schema from `techstack.md` and `approach.md`.
    *   Transfer and reformat Edge Function details from `edgefunctions.md` (focusing on the core, active functions and development patterns).
    *   Add information on Supabase Storage conventions.

5.  **Develop `FRONTEND_GUIDE.md`:**
    *   Create `FRONTEND_GUIDE.md`.
    *   Transfer frontend technology stack from `techstack.md`.
    *   Consolidate frontend architectural points from `README.md`, `techstack.md`, and `approach.md`.
    *   Detail component structure, state management, styling, and key UI workflows.

6.  **Refine `README.md`:**
    *   Ensure it's concise and clearly links to `document_index.md` and `CONTRIBUTING.md`.
    *   Move detailed architectural/stack information to the new dedicated documents, leaving a summary in the README.

7.  **Review `CONTRIBUTING.md` and `CHANGELOG.md`:**
    *   Ensure they are up-to-date and need no immediate changes.

8.  **Update `tasklist.md` (Guidance for Future):**
    *   Add a note or section in `tasklist.md` encouraging the team to move permanent documentation insights into the new static files rather than letting `tasklist.md` become a knowledge silo.

9.  **Handle Old Files:**
    *   Once content is migrated and verified, decide whether to:
        *   Delete: `edgefunctions.md`, `techstack.md`, `approach.md`.
        *   Archive: `CODE_REVIEW_ISSUES.md`, `WORKFLOW_ANALYSIS.md` (e.g., move to a `docs/archive/` directory or simply delete if all value is extracted).

10. **Commit and Push:**
    *   Commit changes incrementally with clear messages (e.g., `docs(structure): Create document_index.md`, `docs(architecture): Draft ARCHITECTURE.md from techstack and approach`).
    *   Push the `feature/docs-refactor` branch.

11. **Pull Request:**
    *   Create a Pull Request from `feature/docs-refactor` to `develop`.
    *   Describe the changes and the new documentation structure in the PR.
    *   Request review.

## Review and Approval

This plan is now ready for your review. Please let me know if you approve this plan, or if you'd like any modifications, before I proceed with Phase 3. 