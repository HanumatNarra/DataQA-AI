-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_files table to track uploaded files
CREATE TABLE IF NOT EXISTS user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_tables table to store CSV/Excel schema information
CREATE TABLE IF NOT EXISTS user_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  columns JSONB NOT NULL,
  row_count INTEGER NOT NULL,
  sample_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pdf_chunks table for storing text chunks with embeddings (unified for all file types)
CREATE TABLE IF NOT EXISTS pdf_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_status ON user_files(status);
CREATE INDEX IF NOT EXISTS idx_user_tables_user_id ON user_tables(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tables_file_id ON user_tables(file_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_user_id ON pdf_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_file_id ON pdf_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_chunk_type ON pdf_chunks(chunk_type);

-- Create vector index for fast similarity search
CREATE INDEX IF NOT EXISTS pdf_chunks_embedding_idx ON pdf_chunks USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_files
CREATE POLICY "Users can view their own files" ON user_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON user_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON user_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON user_files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_tables
CREATE POLICY "Users can view their own tables" ON user_tables
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tables" ON user_tables
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tables" ON user_tables
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tables" ON user_tables
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pdf_chunks (unified for all file types)
CREATE POLICY "Users can view their own chunks" ON pdf_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chunks" ON pdf_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chunks" ON pdf_chunks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks" ON pdf_chunks
  FOR DELETE USING (auth.uid() = user_id);
