-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to match chunks by similarity (unified for all file types)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_index int,
  similarity float,
  metadata jsonb,
  chunk_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.chunk_text,
    pc.chunk_index,
    1 - (pc.embedding <=> query_embedding) as similarity,
    pc.metadata,
    pc.chunk_type
  FROM pdf_chunks pc
  WHERE pc.user_id = user_id_param
    AND 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to match chunks by file
CREATE OR REPLACE FUNCTION match_chunks_by_file(
  query_embedding vector(1536),
  file_id_param uuid,
  match_threshold float,
  match_count int,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_index int,
  similarity float,
  metadata jsonb,
  chunk_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.chunk_text,
    pc.chunk_index,
    1 - (pc.embedding <=> query_embedding) as similarity,
    pc.metadata,
    pc.chunk_type
  FROM pdf_chunks pc
  WHERE pc.user_id = user_id_param
    AND pc.file_id = file_id_param
    AND 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get chunk context
CREATE OR REPLACE FUNCTION get_chunk_context(
  chunk_id_param uuid,
  user_id_param uuid,
  context_size int DEFAULT 2
)
RETURNS TABLE (
  chunk_text text,
  chunk_index int,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_index int;
BEGIN
  -- Get the target chunk index
  SELECT chunk_index INTO target_index
  FROM pdf_chunks
  WHERE id = chunk_id_param AND user_id = user_id_param;
  
  IF target_index IS NULL THEN
    RETURN;
  END IF;
  
  -- Return context around the target chunk
  RETURN QUERY
  SELECT 
    pc.chunk_text,
    pc.chunk_index,
    pc.metadata
  FROM pdf_chunks pc
  WHERE pc.user_id = user_id_param
    AND pc.file_id = (SELECT file_id FROM pdf_chunks WHERE id = chunk_id_param)
    AND pc.chunk_index BETWEEN GREATEST(0, target_index - context_size) 
                           AND target_index + context_size
  ORDER BY pc.chunk_index;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_chunks(vector(1536), float, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION match_chunks_by_file(vector(1536), uuid, float, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chunk_context(uuid, uuid, int) TO authenticated;
