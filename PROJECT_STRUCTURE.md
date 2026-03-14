# Data-QA Project Structure

**Last Updated:** January 19, 2026
**Version:** 1.0.0

This document describes the clean, organized structure of the Data-QA application after comprehensive cleanup and refactoring.

---

## 📁 Root Directory Structure

```
data-qa-app/
├── docs/                           # Documentation
├── public/                         # Static assets
├── src/                            # Application source code
├── scripts/                        # Build and test scripts
├── supabase/                       # Database migrations
├── .github/                        # GitHub workflows
├── .husky/                         # Git hooks
├── node_modules/                   # Dependencies (ignored)
├── .next/                          # Next.js build output (ignored)
├── database_functions.sql          # Database function definitions
├── database_schema.sql             # Database schema definition
├── CONTRIBUTING.md                 # Contribution guidelines
├── LICENSE                         # MIT License
├── README.md                       # Main project documentation
├── SECURITY.md                     # Security documentation
├── package.json                    # Project metadata & dependencies
├── package-lock.json              # Dependency lock file
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.mjs              # PostCSS configuration
├── eslint.config.mjs               # ESLint configuration (flat format)
├── next-env.d.ts                   # Next.js TypeScript declarations
├── .env.example                    # Environment variable template
├── .env.local                      # Local environment (ignored)
└── .gitignore                      # Git ignore patterns
```

---

## 📚 Documentation (`docs/`)

Archive and feature documentation moved to keep root clean:

```
docs/
├── CHART_MANAGEMENT_README.md      # Chart feature documentation
├── FILE_PREVIEW_README.md          # File preview feature docs
├── CLEANUP_COMPLETED.md            # Cleanup history (archive)
└── TRANSFORMATION_SUMMARY.md       # Transformation notes (archive)
```

**Root Documentation:**
- `README.md` - Main project documentation, setup instructions
- `CONTRIBUTING.md` - Development guidelines, coding standards
- `SECURITY.md` - Security features, compliance, audit history
- `LICENSE` - MIT License

---

## 💻 Source Code (`src/`)

Next.js full-stack application structure (frontend and backend integrated):

```
src/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Auth route group
│   │   ├── login/                  # Login page
│   │   └── signup/                 # Signup page
│   ├── api/                        # Backend API routes
│   │   ├── auth/                   # Authentication endpoints
│   │   │   └── sign-out/
│   │   ├── charts/                 # Chart management
│   │   │   ├── [id]/              # Get chart by ID
│   │   │   ├── delete/            # Delete charts
│   │   │   ├── recent/            # List recent charts
│   │   │   ├── signed-url/        # Get signed URLs
│   │   │   └── upload-thumbnail/  # Upload thumbnails
│   │   ├── plots/                  # Chart generation
│   │   ├── process/                # File processing
│   │   ├── search/                 # Search & query
│   │   ├── upload/                 # File upload initiation
│   │   └── uploads/                # Upload management
│   │       ├── [id]/content/      # Get upload content
│   │       ├── delete/            # Delete uploads
│   │       ├── recent/            # List recent uploads
│   │       └── sign/              # Sign upload URLs
│   ├── charts/                     # Charts dashboard page
│   ├── dashboard/                  # Main dashboard page
│   ├── marketing/                  # Marketing/landing pages
│   ├── auth/                       # Auth callback handlers
│   ├── favicon.ico                 # App icon
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout (with ErrorBoundary)
│   └── page.tsx                    # Homepage
│
├── components/                     # React components
│   ├── ui/                         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   ├── ChatInterface.tsx           # Natural language query interface
│   ├── ChartDisplay.tsx            # Chart rendering component
│   ├── ChartGallery.tsx            # Chart gallery view
│   ├── DataPreview.tsx             # Data preview component
│   ├── ErrorBoundary.tsx           # Error boundary for production
│   ├── FileUpload.tsx              # File upload component
│   ├── QueryInput.tsx              # Query input component
│   ├── Sidebar.tsx                 # Dashboard sidebar
│   └── ThemeToggle.tsx             # Dark mode toggle
│
├── lib/                            # Utilities & backend logic
│   ├── query/                      # Query processing modules
│   │   ├── queryProcessor.ts       # Main orchestrator (188 lines)
│   │   ├── queryClassifier.ts      # Classification logic (620 lines)
│   │   ├── tableAnalyzer.ts        # Table analysis (525 lines)
│   │   └── responseFormatter.ts    # Response formatting (346 lines)
│   ├── __tests__/                  # Unit tests
│   │   └── chartExport.test.ts
│   ├── apiResponse.ts              # Standardized API responses
│   ├── chartExport.ts              # Chart export utilities
│   ├── chartHistory.ts             # Chart history management
│   ├── chartTheme.ts               # Chart theming
│   ├── csrf.ts                     # CSRF token utilities
│   ├── embeddings.ts               # OpenAI embeddings
│   ├── filePreview.ts              # File preview utilities
│   ├── fileProcessor.ts            # File processing logic
│   ├── logger.ts                   # Structured logging
│   ├── rateLimit.ts                # Rate limiting
│   ├── supabase.ts                 # Supabase client factory
│   ├── universalHybridProcessor.ts # Legacy processor (to be removed)
│   ├── universalQueryClassifier.ts # Legacy classifier (to be removed)
│   ├── universalResponseGenerator.ts # Legacy generator (to be removed)
│   └── utils.ts                    # General utilities
│
├── config/                         # Configuration
│   └── env.ts                      # Environment validation
│
├── contexts/                       # React contexts
│   ├── AuthContext.tsx             # Authentication state
│   ├── ThemeContext.tsx            # Theme state
│   └── UploadContext.tsx           # Upload state
│
├── hooks/                          # Custom React hooks
│   ├── useAuth.ts                  # Authentication hook
│   ├── useCharts.ts                # Chart management hook
│   ├── useDebounce.ts              # Debounce hook
│   ├── useQuery.ts                 # Query hook
│   ├── useTheme.ts                 # Theme hook
│   └── useUploads.ts               # Upload management hook
│
├── workers/                        # Web Workers
│   └── fileProcessorWorker.ts      # Background file processing
│
└── middleware.ts                   # Next.js middleware (CSRF, rate limiting)
```

### Key Architecture Notes

**Next.js Full-Stack Pattern:**
- Next.js integrates frontend and backend in a single unified structure
- `src/app/` contains both pages (frontend) and `api/` routes (backend)
- This is the **recommended** Next.js structure, not a messy setup
- Separating into frontend/backend folders would break Next.js conventions

**Route Groups:**
- `(auth)` - Auth pages grouped without affecting URL structure
- `api/` - Backend API routes at `/api/*` URLs
- Regular folders map to URL paths

**Component Organization:**
- `components/ui/` - Generic reusable components
- `components/*.tsx` - Feature-specific components

**Backend Logic:**
- `lib/` - Utilities, business logic, data processing
- `lib/query/` - Query processing refactored into 4 modules
- API routes in `app/api/` handle HTTP requests

---

## 🗄️ Database (`supabase/`)

Database migrations in chronological order:

```
supabase/
└── migrations/
    ├── 20241220_create_user_profiles.sql
    ├── 20250821_create_chart_history.sql
    ├── 20250821_create_chart_storage.sql
    └── 20250127_add_chart_thumbnails.sql
```

**Root SQL files:**
- `database_schema.sql` - Complete schema for manual setup
- `database_functions.sql` - PostgreSQL functions (vector search, etc.)

---

## 🎨 Public Assets (`public/`)

Static files served at root URL path:

```
public/
├── images/                         # Marketing and feature images
│   ├── demo-loop.gif              # Demo animation
│   ├── og-image.png               # Open Graph image
│   ├── *_card.png                 # Feature cards (ecommerce, finance, etc.)
│   └── *.png                      # Screenshots and assets
├── file.svg                        # Next.js default icons
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

---

## 🧪 Scripts (`scripts/`)

Testing and utility scripts:

```
scripts/
└── audit_commands.md              # Audit command documentation
```

**NPM Scripts** (from `package.json`):
```json
{
  "dev": "next dev",                          // Development server
  "build": "next build",                      // Production build
  "start": "next start",                      // Production server
  "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
  "lint:fix": "eslint . --ext .ts,.tsx --fix",
  "typecheck": "tsc --noEmit",
  "validate": "npm run typecheck && npm run lint && npm run build",
  "test:smoke": "tsx scripts/smoke-e2e.ts",
  "test:semantic": "tsx scripts/semantic-invariants.test.ts",
  "test:charts": "tsx scripts/test-chart-generation.ts",
  "test:chat": "tsx scripts/test-chat-functionality.ts",
  "test:all": "npm run test:semantic && npm run test:charts && npm run test:chat"
}
```

---

## 🔧 Configuration Files

### TypeScript
- `tsconfig.json` - TypeScript compiler configuration (strict mode enabled)
- `next-env.d.ts` - Next.js type declarations (auto-generated)

### Next.js
- `next.config.ts` - Next.js configuration with CSP headers

### Styling
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `src/app/globals.css` - Global styles and Tailwind directives

### Linting
- `eslint.config.mjs` - ESLint flat config format (modern)

### Git
- `.gitignore` - Comprehensive ignore patterns
- `.husky/` - Pre-commit hooks for code quality

### Environment
- `.env.example` - Template with all required variables
- `.env.local` - Local secrets (never committed)

---

## 🚫 Ignored Files & Folders

These are properly gitignored but exist locally:

- `node_modules/` - 734 MB of dependencies
- `.next/` - 423 MB Next.js build cache
- `.env.local` - Environment variables with secrets
- `tsconfig.tsbuildinfo` - TypeScript build cache
- `.DS_Store` - macOS system files

---

## 📦 Dependencies

### Production Dependencies (20)
- **Framework:** `next@15.4.6`, `react@19.1.0`, `react-dom@19.1.0`
- **Backend:** `@supabase/supabase-js@2.55.0`, `@supabase/auth-helpers-nextjs@0.10.0`
- **AI/ML:** `openai@5.12.2`
- **File Processing:** `papaparse@5.5.3`, `xlsx@0.18.5`, `pdf-parse@2.4.5`, `pdf-lib@1.17.1`
- **Charting:** `recharts@3.1.2`, `vega@6.1.2`, `vega-lite@6.2.0`
- **Utilities:** `zod@3.25.76`, `clsx@2.1.1`, `tailwind-merge@3.3.1`
- **UI:** `framer-motion@12.23.12`, `lucide-react@0.539.0`, `@heroicons/react@2.2.0`
- **Other:** `canvas@3.2.0`, `html2canvas@1.4.1`

### Dev Dependencies (11)
- **TypeScript:** `typescript@5`, `@types/node@20`, `@types/react@19`, etc.
- **Linting:** `eslint@9`, `eslint-config-next@15.4.6`, `@eslint/eslintrc@3`
- **Styling:** `tailwindcss@4`, `@tailwindcss/postcss@4`
- **Git Hooks:** `husky@9`, `lint-staged@15`
- **Testing:** `tsx@4.20.4`

---

## 🏗️ Architecture Principles

### Security First
- All API routes require authentication
- CSRF protection via middleware
- Rate limiting on all endpoints
- Structured logging for audit trails
- Error boundaries prevent crashes

### Code Quality
- TypeScript strict mode throughout
- Standardized patterns (API responses, error handling, logging)
- Modular architecture (query processing split into 4 modules)
- No `console.log` - structured logging only
- Comprehensive linting rules

### Developer Experience
- Clear folder structure following Next.js conventions
- Comprehensive documentation
- Environment variable validation
- Pre-commit hooks for quality checks
- Helpful error messages

### Production Ready
- Build validation pipeline
- Error boundaries for graceful failures
- Rate limiting prevents abuse
- Comprehensive security headers
- Database migrations tracked

---

## 🔄 Recent Cleanup (January 2026)

### Files Removed
- ❌ `.eslintrc.json` - Duplicate config (migrated to eslint.config.mjs)
- ❌ `src/lib/supabase-server.ts` - Unused file
- ❌ `tsconfig.tsbuildinfo` - Build artifact
- ❌ `.DS_Store` files - macOS system files
- ❌ `SECURITY_FIXES_SUMMARY.md` - Consolidated into SECURITY.md
- ❌ `docs/README.md` - Duplicate of root README
- ❌ `docs/SETUP_INSTRUCTIONS.md` - Duplicate of root README
- ❌ `front-end/` - Legacy Vite app (450+ MB)
- ❌ `restore-points/` - Git backups
- ❌ `next.config.js` - Duplicate config

### Files Reorganized
- ✅ `CLEANUP_COMPLETED.md` → `docs/`
- ✅ `TRANSFORMATION_SUMMARY.md` → `docs/`
- ✅ Enhanced `SECURITY.md` with consolidated security info

### Files Created
- ✅ `PROJECT_STRUCTURE.md` - This document
- ✅ `CONTRIBUTING.md` - Development guidelines
- ✅ `LICENSE` - MIT License
- ✅ Enhanced `README.md` - Comprehensive project docs

---

## 📈 Project Statistics

- **Total Source Files:** ~80 TypeScript/React files
- **API Endpoints:** 14 routes
- **React Components:** ~25 components
- **Database Tables:** 4 main tables (user_files, user_tables, pdf_chunks, chart_history)
- **Lines of Code:** ~15,000 lines (estimated, excluding node_modules)
- **Documentation:** ~2,500 lines across all docs
- **Test Coverage:** Partial (expandable)

---

## 🎯 Next.js Structure Explained

**Why isn't frontend/backend separated?**

Next.js is a **full-stack framework** where frontend and backend are intentionally integrated:

1. **Pages and API routes coexist** in `src/app/`
2. **Server Components** can fetch data directly (no API needed)
3. **API Routes** live alongside pages they serve
4. **Shared utilities** in `src/lib/` used by both frontend and backend

This is **not messy** - it's the recommended Next.js architecture. Benefits:
- Faster development (no context switching)
- Better code sharing
- Optimized data fetching
- Simpler deployment (single app)

**Traditional frontend/backend separation** would require:
- Separate repositories or monorepo
- API versioning complexity
- CORS configuration
- Duplicate type definitions
- More deployment complexity

The current structure is **professional, modern, and production-ready**.

---

## 📖 Further Reading

- **Setup Instructions:** See `README.md`
- **Contributing Guidelines:** See `CONTRIBUTING.md`
- **Security Documentation:** See `SECURITY.md`
- **Feature Documentation:** See `docs/` folder
- **Next.js Documentation:** https://nextjs.org/docs

---

**Last Updated:** January 19, 2026
**Maintained by:** Data-QA Contributors
**License:** MIT
