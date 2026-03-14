# Data-QA Web Application

An intelligent data analysis platform that allows users to upload data files (CSV, XLSX, PDF), ask natural language questions, and generate interactive visualizations.

## Features

- **Multi-Format File Upload**: Support for CSV, Excel (XLSX), JSON, and PDF files
- **Vector Search**: OpenAI embeddings for semantic search across your data
- **Natural Language Queries**: Ask questions about your data in plain English
- **Interactive Charts**: Auto-generate bar, line, area, and pie charts from your data
- **Chart History**: Save and manage up to 20 recent charts per user
- **File Management**: Upload, preview, and delete files with ease
- **Authentication**: Secure user authentication via Supabase Auth
- **Dark Mode**: Full dark mode support for comfortable viewing

## Tech Stack

- **Framework**: Next.js 15.4.6 (App Router)
- **Runtime**: React 19, TypeScript 5
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI/ML**: OpenAI API (text-embedding-3-small)
- **Charts**: Recharts + Vega-Lite
- **Styling**: Tailwind CSS 4
- **File Parsing**: Papa Parse (CSV), xlsx, pdf-parse

## Prerequisites

- Node.js 18+ and npm
- Supabase project with:
  - PostgreSQL database with pgvector extension
  - Storage bucket (`user-files`)
  - Auth enabled
- OpenAI API key

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `ENV_EXAMPLE.md` for detailed descriptions of each variable.

### 3. Database Setup

Run the SQL scripts to set up your database schema:

```bash
# In your Supabase SQL editor:
# 1. Run database_schema.sql
# 2. Run database_functions.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Authentication pages (sign-in, sign-up)
│   ├── /api/            # API routes (14 endpoints)
│   ├── /dashboard/      # Main dashboard
│   ├── /charts/         # Chart detail view
│   └── /marketing/      # Landing page
├── components/          # React components (45 files)
│   ├── /auth/          # Auth forms
│   ├── /charts/        # Chart management
│   ├── /files/         # File operations
│   └── /ui/            # Reusable UI components
├── lib/                # Utilities & business logic
│   ├── supabase.ts             # Standardized Supabase clients
│   ├── apiResponse.ts          # API response utilities
│   ├── rateLimit.ts            # Rate limiting
│   ├── logger.ts               # Structured logging
│   ├── embeddings.ts           # OpenAI integration
│   ├── universalHybridProcessor.ts  # Query processing
│   └── ...
├── hooks/              # Custom React hooks
├── contexts/           # Context providers
└── middleware.ts       # CSRF protection, rate limiting, auth
```

## API Endpoints

### Files
- `POST /api/upload` - Upload a file (CSV, XLSX, JSON, PDF)
- `POST /api/process` - Process and vectorize uploaded file
- `GET /api/uploads/recent` - List user's recent files
- `POST /api/uploads/sign` - Generate signed download URL
- `POST /api/uploads/delete` - Delete a file
- `GET /api/uploads/[id]/content` - Download file content

### Data & Search
- `POST /api/search` - Query data with natural language
- `POST /api/plots` - Generate chart from query

### Charts
- `GET /api/charts/recent` - List recent charts
- `POST /api/charts/signed-url` - Generate signed chart image URL
- `POST /api/charts/upload-thumbnail` - Upload chart thumbnail
- `DELETE /api/charts/[id]` - Delete a chart
- `POST /api/charts/delete` - Batch delete charts

### Auth
- `POST /api/auth/sign-out` - Server-side sign-out

## Security Features

- ✅ **CSRF Protection**: Origin header validation for state-changing requests
- ✅ **Rate Limiting**: Different limits per endpoint type (5-60 req/min)
- ✅ **Row-Level Security (RLS)**: Database-level access control
- ✅ **Content Security Policy (CSP)**: Strengthened headers, removed unsafe-inline for scripts
- ✅ **Authentication**: Cookie-based sessions with HTTP-only cookies
- ✅ **Input Validation**: Zod schemas on all API endpoints
- ✅ **File Validation**: MIME type + extension checks, 10MB limit

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler
npm run test:smoke   # Run smoke tests
npm run test:all     # Run all tests
```

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with Next.js rules
- **Husky**: Pre-commit hooks
- **lint-staged**: Staged file linting

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables (Production)

Ensure all environment variables from `.env.local` are set in your deployment platform.

## Performance Considerations

- **Vector Search**: Uses pgvector with HNSW indexing for fast similarity search
- **Chunking Strategy**:
  - CSV/Excel: Row-based chunking
  - PDF: 1000-character chunks with 200-char overlap
- **Caching**: Supabase handles query caching
- **Image Optimization**: Next.js automatic image optimization

## Known Limitations

- **PDF Files**: Text-based PDFs only (scanned images not supported)
- **File Size**: 10MB upload limit
- **Chart History**: Limited to last 20 charts per user
- **Rate Limiting**: In-memory store (not suitable for multi-instance deployments)

## Troubleshooting

### Vector Search Not Working
- Ensure pgvector extension is enabled in Supabase
- Verify OpenAI API key is valid
- Check `database_functions.sql` is executed

### File Upload Fails
- Check Supabase storage bucket exists (`user-files`)
- Verify service role key has storage permissions
- Ensure file size is under 10MB

### Authentication Issues
- Verify Supabase URL and anon key are correct
- Check auth is enabled in Supabase project
- Clear browser cookies and try again

## Documentation

- `SECURITY_FIXES_SUMMARY.md` - Security improvements made
- `SETUP_INSTRUCTIONS.md` - Detailed setup guide
- `CHART_MANAGEMENT_README.md` - Chart system overview
- `FILE_PREVIEW_README.md` - File preview feature
- `SECURITY.md` - Security posture overview

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please [open an issue](https://github.com/your-repo/issues).

---

Built with ❤️ using Next.js, Supabase, and OpenAI
