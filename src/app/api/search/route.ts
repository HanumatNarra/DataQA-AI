import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServerClient, verifyBearerToken } from '@/lib/supabase'
import { processUniversalQuery } from '@/lib/universalHybridProcessor'
import { detectInsightIntent, generateInsights } from '@/lib/insightsEngine'
import { generateEmbedding } from '@/lib/embeddings'
import { searchLogger } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via route handler client (handles cookie refresh)
    const authClient = await createRouteHandlerClient()
    let user: User | null = null
    try {
      const { data } = await authClient.auth.getUser()
      user = data?.user ?? null
    } catch (e) {
      searchLogger.warn('auth.getUser() failed, trying Authorization header fallback', {
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    if (!user) {
      const authHeader = request.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        user = await verifyBearerToken(token)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin client for privileged database operations
    const supabase = createServerClient()

    const { query, conversationContext } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Use authenticated user's ID instead of user-supplied userId
    const userId = user.id

    searchLogger.info('Processing search query', {
      query,
      userId
    })

    // Enhance query with context if available
    let enhancedQuery = query;
    let contextApplied = false;

    if (conversationContext && conversationContext.lastQuery && conversationContext.lastFilters) {
      // Check if this is a follow-up query that needs context
      const lowerQuery = query.toLowerCase();

      const isFollowUp = lowerQuery.includes('them') ||
                        lowerQuery.includes('these') ||
                        lowerQuery.includes('list') ||
                        lowerQuery.includes('show') ||
                        lowerQuery.includes('name') ||
                        lowerQuery.includes('what are') ||
                        lowerQuery.includes('which are') ||
                        lowerQuery.includes('all') ||
                        lowerQuery.includes('everyone') ||
                        lowerQuery.includes('everybody') ||
                        lowerQuery.includes('said') ||
                        lowerQuery.includes('previous') ||
                        lowerQuery.includes('above') ||
                        lowerQuery.includes('mentioned') ||
                        // Handle user responses to system follow-up questions
                        lowerQuery === 'yes' ||
                        lowerQuery === 'no' ||
                        lowerQuery === 'sure' ||
                        lowerQuery === 'okay' ||
                        lowerQuery === 'ok' ||
                        lowerQuery === 'please' ||
                        lowerQuery === 'show me' ||
                        lowerQuery === 'list them' ||
                        lowerQuery === 'show them' ||
                        lowerQuery === 'display' ||
                        lowerQuery === 'see' ||
                        lowerQuery === 'view';

      if (isFollowUp) {
        searchLogger.info('Detected follow-up query, enhancing with context', {
          originalQuery: query,
          contextFilters: conversationContext.lastFilters,
          contextEntity: conversationContext.lastEntityType
        });

        // Handle different types of follow-up responses
        if (lowerQuery === 'yes' || lowerQuery === 'sure' || lowerQuery === 'okay' || lowerQuery === 'ok' || lowerQuery === 'please') {
          // User is agreeing to see a list - convert to list query
          enhancedQuery = `list all ${conversationContext.lastEntityType} where ${conversationContext.lastFilters}`;
          contextApplied = true;
        } else if (lowerQuery === 'no') {
          // User is declining - provide a simple acknowledgment
          enhancedQuery = `acknowledge decline for ${conversationContext.lastEntityType}`;
          contextApplied = true;
        } else if (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('display') || lowerQuery.includes('see') || lowerQuery.includes('view')) {
          // User is explicitly asking to see/list items
          enhancedQuery = `list all ${conversationContext.lastEntityType} where ${conversationContext.lastFilters}`;
          contextApplied = true;
        } else {
          // Regular follow-up query - combine with previous context
          if (conversationContext.lastFilters && conversationContext.lastFilters.trim()) {
            enhancedQuery = `${query} where ${conversationContext.lastFilters}`;
            contextApplied = true;
          } else {
            enhancedQuery = `${query} for ${conversationContext.lastEntityType}`;
            contextApplied = true;
          }
        }
      }
    }

    void contextApplied // used for tracking context enhancement

    // Get user's files
    const { data: userFiles, error: filesError } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', userId)

    if (filesError) {
      searchLogger.error('Error fetching user files', filesError, {
        userId
      })
      return NextResponse.json(
        { error: 'Failed to fetch user files' },
        { status: 500 }
      )
    }

    searchLogger.info('User files fetched', {
      fileCount: userFiles?.length || 0,
      userId
    })

    // Get total chunks for this user
    const { data: totalChunks, error: totalError } = await supabase
      .from('pdf_chunks')
      .select(`
        *,
        user_files!inner(filename)
      `)
      .eq('user_id', userId)

    if (totalError) {
      searchLogger.error('Error fetching total chunks', totalError, { userId })
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    searchLogger.info('Total chunks found', {
      chunkCount: totalChunks?.length || 0,
      userId
    })

    // For analytical/count queries, get ALL data for complete analysis
    let searchResults: Record<string, any>[] = []
    let searchMethod = 'unknown'

    // Simple query type detection for data retrieval strategy
    const lowerQuery = enhancedQuery.toLowerCase();
    const isAnalyticalQuery = lowerQuery.includes('per') || lowerQuery.includes('by') || lowerQuery.includes('breakdown') || lowerQuery.includes('total') || lowerQuery.includes('sum') || lowerQuery.includes('average') || lowerQuery.includes('mean');
    const isCountQuery = lowerQuery.includes('how many') || lowerQuery.includes('count');
    const isListQuery = lowerQuery.includes('list') || lowerQuery.includes('name') || lowerQuery.includes('show') || lowerQuery.includes('what is');
    const isComplexQuery = lowerQuery.includes('with') || lowerQuery.includes('where') || lowerQuery.includes('filter') || lowerQuery.includes('status') || lowerQuery.includes('from');

    if (isAnalyticalQuery || isCountQuery || isListQuery || isComplexQuery) {
      searchLogger.info('Analytical/count/list/complex query detected — bypassing vector search', {
        query: enhancedQuery
      })

      // Get ALL chunks for complete data analysis with filename
      const { data: allChunks, error: allChunksError } = await supabase
        .from('pdf_chunks')
        .select(`
          *,
          user_files!inner(filename)
        `)
        .eq('user_id', userId)
        .in('chunk_type', ['csv_row'])
        .order('chunk_index', { ascending: true })

      if (allChunksError) {
        searchLogger.error('Error fetching all chunks', allChunksError, { userId })
        return NextResponse.json(
          { error: 'Failed to fetch data' },
          { status: 500 }
        )
      }

      // Transform chunks to include filename directly
      searchResults = (allChunks || []).map((chunk: Record<string, any>) => ({
        ...chunk,
        filename: chunk.user_files.filename
      }))

      searchMethod = 'complete_data_retrieval'
      searchLogger.info('Complete data retrieval', {
        chunkCount: searchResults.length
      })
    } else {
      // For simple content queries, try vector search first, then fallback to text search
      searchLogger.info('Using vector search for simple content queries')

      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(enhancedQuery)

        // Try vector search with the generated embedding
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.3,
          match_count: 20,
          user_id_param: userId
        })

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          // Transform vector results to include filename
          searchResults = (vectorResults || []).map((chunk: Record<string, any>) => ({
            ...chunk,
            filename: chunk.metadata?.file_name || 'unknown'
          }))
          searchMethod = 'vector_search'
        } else {
          throw new Error('Vector search failed or no results');
        }
      } catch (vectorError) {
        searchLogger.warn('Vector search failed, falling back to text search', {
          error: vectorError instanceof Error ? vectorError.message : 'Unknown error'
        })

        // Fallback to text search
        const { data: textResults, error: searchError } = await supabase
          .from('pdf_chunks')
          .select(`
            *,
            user_files!inner(filename)
          `)
          .eq('user_id', userId)
          .ilike('chunk_text', `%${enhancedQuery}%`)
          .limit(20)

        if (searchError) {
          console.error('[SEARCH] Text search failed:', searchError)
          return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
          )
        }

        // Transform text results to include filename
        searchResults = (textResults || []).map((chunk: Record<string, any>) => ({
          ...chunk,
          filename: chunk.user_files.filename
        }))

        searchMethod = 'text_search'
      }
    }

    searchLogger.info('Search complete', {
      queryType: isAnalyticalQuery ? 'analytical' : isCountQuery ? 'count' : isListQuery ? 'list' : 'content',
      searchMethod,
      chunkCount: searchResults.length
    })

    // Generate universal response
    const universalResponse = await processUniversalQuery(enhancedQuery, searchResults, conversationContext)

    // If the user explicitly asks for insights/suggestions, run the insights engine
    if (detectInsightIntent(query)) {
      const insights = await generateInsights(searchResults)
      return NextResponse.json({
        success: true,
        type: 'insights',
        query: enhancedQuery,
        message: insights.message,
        insights: insights.insights,
        stats: insights.stats,
        conversationContext: universalResponse.conversationContext
      })
    }

    return NextResponse.json({
      success: true,
      type: 'universal_analysis',
      query: enhancedQuery,
      message: universalResponse.message,
      count: universalResponse.count,
      items: universalResponse.items,
      breakdown: universalResponse.breakdown,
      conversationContext: universalResponse.conversationContext
    })

  } catch (error) {
    console.error('[SEARCH] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
