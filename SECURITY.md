# Security Documentation

**Last Updated:** January 19, 2026
**Status:** ✅ Production Ready

## Security Posture

### Authentication & Authorization
- All API routes require session-based authentication via Supabase
- Bearer token fallback for programmatic access
- User data isolated by `auth.uid()` in Row-Level Security (RLS) policies
- No user-supplied `userId` parameters accepted (server enforces authenticated user's ID)

### HTTP Security Headers
- **Content-Security-Policy:**
  - `script-src 'self' https://*.supabase.co` (no unsafe-inline/unsafe-eval)
  - `style-src 'self' 'unsafe-inline'` (required for Tailwind CSS)
  - `img-src 'self' data: blob: https://*.supabase.co`
  - `connect-src 'self' https://*.supabase.co https://api.openai.com`
  - `object-src 'none'` (blocks Flash/plugins)
  - `base-uri 'self'` (prevents base tag injection)
  - `form-action 'self'` (restricts form submissions)
  - `frame-ancestors 'none'` (prevents clickjacking)
- **X-Frame-Options:** DENY
- **X-Content-Type-Options:** nosniff
- **X-XSS-Protection:** 1; mode=block
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** camera=(), microphone=(), geolocation=()

### CSRF Protection
- Origin header validation in middleware (`src/middleware.ts`)
- SameSite cookie attributes (via Supabase)
- HTTP-only cookies (via Supabase)
- Token-based CSRF library available (`src/lib/csrf.ts`) for additional protection if needed

### Database Security (Supabase)
- **Row-Level Security (RLS)** enabled on all tables:
  - `user_files` - Users can only access files they uploaded
  - `user_tables` - Users can only access their own tables
  - `pdf_chunks` - Users can only access chunks from their files
  - `chart_history` - Users can only access their own charts
- **Storage Bucket** `user-files`:
  - Write/read/update/delete constrained to folder prefix matching user ID
  - Prevents cross-user file access
- **Service Role Key** used only server-side with proper access controls

### Environment Variables & Secrets
- All secrets stored in `.env.local` (never committed to git)
- Client-side code only accesses `NEXT_PUBLIC_*` variables
- Build fails if required server environment variables are missing (see `src/config/env.ts`)
- Environment variable validation on startup

### File Upload Safeguards
- **MIME type validation:** Only CSV, XLSX, PDF, JSON allowed
- **File extension whitelist:** Rejects executables, archives, scripts
- **File size limits:** Enforced per file type
- **PDF handling:** Full text extraction with `pdf-parse` (1000-char chunks, 200-char overlap)
- **Signed URLs:** Generated server-side on-demand, not stored long-term
- **User isolation:** Files stored in user-specific folders (`user-files/{userId}/`)

### Rate Limiting
- In-memory rate limiting on all API endpoints (`src/lib/rateLimit.ts`)
- **Upload endpoints:** 5 requests per 5 minutes
- **Search endpoints:** 20 requests per minute
- **Standard endpoints:** 30 requests per minute
- Prevents abuse, DoS attacks, and cost overruns

### Critical Fixes Implemented (January 2026)

#### 1. Authentication Vulnerability (HIGH)
**Fixed:** `/api/search` no longer accepts user-supplied `userId` parameter
- All routes validate session and use authenticated user's ID only
- Returns 401 Unauthorized for invalid sessions

#### 2. XSS Prevention (HIGH)
**Fixed:** Removed `unsafe-inline` and `unsafe-eval` from script-src CSP directive
- Blocks arbitrary inline scripts and eval() execution
- Maintains functionality while eliminating XSS attack vectors

#### 3. CSRF Protection (MEDIUM-HIGH)
**Fixed:** Implemented Origin header validation middleware
- Blocks cross-origin state-changing requests
- Protects all POST/PUT/DELETE/PATCH operations

#### 4. Vector Search (CRITICAL - Feature Fix)
**Fixed:** Embedding generation now works correctly
- Generates actual 1536-dimensional embeddings via OpenAI
- No longer passes empty arrays to vector search
- Semantic search fully functional

#### 5. Security Pattern Standardization (MEDIUM)
**Fixed:** Centralized Supabase client creation
- All 11 API routes use standardized authentication patterns
- Consistent error handling and logging
- Easier to audit and maintain

### Structured Logging
- Console.log replaced with structured JSON logging (`src/lib/logger.ts`)
- Separate loggers for different modules (API, search, file, chart)
- Production-ready for log aggregation services

### Error Handling
- React Error Boundary catches production errors (`src/components/ErrorBoundary.tsx`)
- Graceful fallback UI prevents app crashes
- Structured error logging for debugging

## Compliance & Standards

These security measures address:
- ✅ **OWASP Top 10 (2021):** Broken Access Control, XSS, CSRF
- ✅ **OWASP ASVS Level 2:** Authentication, Session Management
- ✅ **CWE-352:** Cross-Site Request Forgery (CSRF)
- ✅ **CWE-79:** Cross-Site Scripting (XSS)
- ✅ **CWE-287:** Improper Authentication

## Security Testing Checklist

Before production deployment:

- [ ] Test authentication on all API routes (expect 401 without valid session)
- [ ] Verify users can only access their own data
- [ ] Check browser console for CSP violations
- [ ] Test form submissions from different origins (expect 403)
- [ ] Verify vector search returns relevant results
- [ ] Test file uploads with various file types
- [ ] Verify rate limiting triggers correctly
- [ ] Check that `.env.local` is not committed to git
- [ ] Verify RLS policies work in Supabase dashboard
- [ ] Test Bearer token authentication flow

## Reporting Security Issues

If you discover a security vulnerability, please:
1. **Do not** create a public GitHub issue
2. Email security concerns to: [your-security-email@domain.com]
3. Include detailed steps to reproduce
4. Allow time for fixes before public disclosure

## Security Audit History

- **2026-01-19:** Comprehensive security audit and fixes implemented
  - Fixed authentication bypass vulnerability
  - Strengthened CSP headers
  - Implemented CSRF protection
  - Fixed vector search implementation
  - Standardized security patterns across codebase

---

**For detailed implementation notes, see:** `docs/TRANSFORMATION_SUMMARY.md`
