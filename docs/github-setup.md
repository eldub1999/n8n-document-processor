# GitHub Repository Setup Guide

This guide provides instructions for setting up the GitHub repository for the N8N Document Processing & RAG Workflow project.

## Prerequisites

- GitHub account
- Git installed on your local machine (if working locally)
- Basic knowledge of Git and GitHub workflows

## Setup Steps

### 1. Create a New Repository

1. **Log in to GitHub**
   - Go to [GitHub](https://github.com) and log in to your account

2. **Create a New Repository**
   - Click the "+" button in the top-right corner
   - Select "New repository"
   - Enter repository details:
     - Name: `n8n-document-processing` (or your preferred name)
     - Description: "Document processing pipeline using n8n and Supabase with RAG capabilities"
     - Visibility: Public or Private (as per your requirements)
     - Initialize with a README: Yes
     - Add .gitignore: Node
   - Click "Create repository"

### 2. Clone the Repository (If Working Locally)

```bash
git clone https://github.com/yourusername/n8n-document-processing.git
cd n8n-document-processing
```

### 3. Set Up Branch Structure

Following the project's branching strategy:

```bash
# Ensure you're on main branch
git checkout main

# Create develop branch
git checkout -b develop

# Push develop branch to remote
git push -u origin develop
```

### 4. Add Project Files

#### Option 1: Upload Files via GitHub Interface

1. Navigate to your repository on GitHub
2. Click "Add file" > "Upload files" or "Create new file"
3. Add each file to the appropriate directory
4. Commit changes with a descriptive message

#### Option 2: Add Files Locally and Push

```bash
# Copy all project files to the repository folder
# Then add and commit them
git add .
git commit -m "feat: initial project setup and documentation"
git push origin develop
```

### 5. Add Collaborators (Optional)

1. Go to your repository on GitHub
2. Click "Settings" > "Manage access"
3. Click "Invite a collaborator"
4. Enter the GitHub usernames or emails of your collaborators
5. Set appropriate permissions

### 6. Set Up Branch Protection (Recommended)

For proper code quality and collaboration:

1. Go to repository "Settings" > "Branches"
2. Click "Add rule" under "Branch protection rules"
3. Configure protection for main and develop branches:
   - Branch name pattern: `main` (create separate rules for each branch)
   - Check "Require pull request reviews before merging"
   - Check "Require status checks to pass before merging" (if using CI)
   - Check "Include administrators" (optional)
   - Click "Create"

### 7. Set Up Project Board (Optional)

To track progress and tasks:

1. Go to the "Projects" tab
2. Click "Create a project"
3. Select "Board" template
4. Name your project "N8N Document Processing Pipeline"
5. Add columns: "To Do", "In Progress", "In Review", "Done"
6. Create issues for each task in the tasklist.md

## Workflow for Development

Follow these steps for ongoing development:

1. **Start a new feature**
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push changes**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Create a Pull Request**
   - Go to the repository on GitHub
   - Click "Pull requests" > "New pull request"
   - Set base branch to `develop` and compare branch to your feature branch
   - Add description and reviewers
   - Create the pull request

5. **Review and Merge**
   - Address any feedback from reviewers
   - Once approved, merge the PR

## Syncing Workflow Changes

Since n8n workflows will be primarily created in n8n.cloud, use this process to keep the GitHub repository in sync:

1. **Export workflows from n8n.cloud**
   - Open the workflow in n8n.cloud
   - Click the three dots in the top-right corner
   - Select "Download"
   - Save the JSON file

2. **Update the repository**
   - Move the JSON file to the `/workflows` directory in your repository
   - Commit and push the changes

## Additional GitHub Features to Consider

- **GitHub Actions**: For automated testing and deployment
- **GitHub Issues**: For tracking bugs and feature requests
- **GitHub Discussions**: For team communication and design decisions
- **GitHub Releases**: For versioning major updates

## Recommended GitHub Integrations

- **Supabase**: Connect your Supabase project to GitHub for schema tracking
- **n8n.cloud**: Use GitHub as a backup and version control for your workflows 