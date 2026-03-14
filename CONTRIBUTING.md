# Contributing to Data-QA

Thank you for your interest in contributing to Data-QA! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Git

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/data-qa-app.git
   cd data-qa-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Database Setup**
   - Run `database_schema.sql` in your Supabase SQL editor
   - Run `database_functions.sql` in your Supabase SQL editor

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## 💻 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch (if applicable)
- Feature branches: `feature/your-feature-name`
- Bug fixes: `fix/issue-description`
- Hotfixes: `hotfix/critical-fix`

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
git fetch origin
git rebase origin/main
```

## 📝 Coding Standards

### TypeScript

- **Strict Mode**: Always enabled
- **Type Safety**: No `any` types without justification
- **Interfaces**: Prefer interfaces over types for object shapes
- **Naming**: PascalCase for components, camelCase for functions/variables

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
}

function fetchUserData(userId: string): Promise<UserData> {
  // ...
}

// ❌ Bad
function fetchUserData(userId: any): any {
  // ...
}
```

### React Components

- **Client Components**: Mark with `'use client'` directive when needed
- **Server Components**: Default for data fetching
- **Naming**: PascalCase, descriptive names
- **File Structure**: One component per file

```tsx
// ✅ Good
'use client'

interface ButtonProps {
  label: string
  onClick: () => void
}

export function SubmitButton({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}

// ❌ Bad
export function btn(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>
}
```

### API Routes

- **Use standardized utilities**:
  - `createServerClient()` for Supabase
  - `apiSuccess()` / `apiError()` for responses
  - `apiLogger` for logging
  - Rate limiting via middleware

```typescript
// ✅ Good
import { apiSuccess, apiError } from '@/lib/apiResponse'
import { apiLogger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    // ... logic
    apiLogger.info('Operation successful', { userId })
    return apiSuccess(data)
  } catch (error) {
    apiLogger.error('Operation failed', error)
    return apiError('Failed to process request', 500)
  }
}

// ❌ Bad
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    console.log('Processing...')
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Logging

**Always use structured logging** instead of `console.log`:

```typescript
import { apiLogger, searchLogger } from '@/lib/logger'

// ✅ Good
apiLogger.info('User logged in', { userId, timestamp })
searchLogger.error('Search failed', error, { query })

// ❌ Bad
console.log('User logged in:', userId)
console.error('Search failed:', error)
```

### File Organization

```
src/
├── app/              # Next.js app router
│   ├── (auth)/      # Auth pages
│   ├── api/         # API routes
│   └── dashboard/   # App pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   └── ...          # Feature components
├── lib/             # Utilities and business logic
│   ├── query/       # Query processing modules
│   └── ...          # Other utilities
└── hooks/           # Custom React hooks
```

## 📨 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(search): add vector search with embeddings

Implemented OpenAI embeddings for semantic search across uploaded files.
- Added embedding generation in query processor
- Updated search endpoint to use vector similarity
- Added fallback to text search

Closes #123
```

```bash
fix(upload): handle PDF files with no extractable text

PDFs with scanned images now store metadata only instead of failing.
Added warning message for users when text extraction is not possible.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run all checks**:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

2. **Test your changes**:
   - Manual testing in dev environment
   - Add automated tests if applicable

3. **Update documentation**:
   - Update README if adding features
   - Add JSDoc comments for complex functions
   - Update API documentation if changing endpoints

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
- [ ] Tested locally
- [ ] Added automated tests
- [ ] Verified with different file types

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Build passes
```

### Review Process

1. At least one approving review required
2. All CI checks must pass
3. No merge conflicts
4. Up-to-date with main branch

## 🧪 Testing

### Running Tests

```bash
npm run test:all        # Run all tests
npm run test:smoke      # Smoke tests
npm run test:semantic   # Semantic tests
```

### Writing Tests

- Place tests next to the file being tested: `component.test.tsx`
- Use descriptive test names
- Test edge cases and error conditions

```typescript
describe('processCSVFile', () => {
  it('should process valid CSV with multiple rows', async () => {
    // Test implementation
  })

  it('should handle empty CSV gracefully', async () => {
    // Test implementation
  })

  it('should throw error for invalid CSV format', async () => {
    // Test implementation
  })
})
```

## 📚 Documentation

### Code Documentation

- **JSDoc for public APIs**:
  ```typescript
  /**
   * Processes a user query and returns search results
   *
   * @param query - Natural language query string
   * @param userId - User ID for data filtering
   * @returns Promise resolving to search results
   * @throws {Error} If query is invalid or database error occurs
   */
  export async function processQuery(query: string, userId: string) {
    // ...
  }
  ```

- **Inline comments for complex logic**:
  ```typescript
  // Split text into overlapping chunks to maintain context
  // between segments for better semantic search accuracy
  while (startIndex < text.length) {
    const chunk = text.slice(startIndex, startIndex + CHUNK_SIZE)
    chunks.push(chunk)
    startIndex += CHUNK_SIZE - OVERLAP
  }
  ```

### README Updates

- Add new features to Features section
- Update setup instructions if dependencies change
- Add troubleshooting steps for common issues

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., macOS]
- Browser: [e.g., Chrome 91]
- Node version: [e.g., 18.0.0]

**Additional context**
Any other relevant information
```

## 💡 Feature Requests

- Search existing issues first
- Describe the feature and its benefits
- Explain alternative solutions considered
- Be open to discussion and feedback

## ❓ Questions

- Check the [documentation](./docs/)
- Search [existing issues](https://github.com/YOUR_REPO/issues)
- Ask in discussions or open a new issue

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Data-QA!** 🎉
