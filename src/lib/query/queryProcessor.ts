import { detectSchemaFromChunks, DetectedSchema } from '../universalSchemaDetector'
import { UniversalDataProcessor } from '../universalDataProcessor'
import {
  detectCrossTableQuery,
  detectCrossReferenceQuery,
  analyzeQueryWithLLM,
  findTargetSchema,
  generateFilterDescription
} from './queryClassifier'
import {
  processSingleTableBreakdown,
  processCrossTableQuery,
  processCrossReferenceQuery
} from './tableAnalyzer'
import { generateIntelligentResponse } from './responseFormatter'

/**
 * Universal response interface
 */
export interface UniversalResponse {
  message: string
  count?: number
  items?: string[]
  breakdown?: any
  isCountQuery: boolean
  isListQuery: boolean
  isAnalyticalQuery: boolean
  conversationContext?: {
    lastQuery: string
    lastFilters: string
    lastEntityType: string
    lastCount: number
    lastGroupByDimension?: string
  }
}

/**
 * Main query processing orchestrator
 * This is the simplified main entry point that delegates to specialized modules
 */
export async function processUniversalQuery(
  query: string,
  chunks: any[],
  conversationContext?: any
): Promise<UniversalResponse> {

  try {
    // Step 1: Detect schemas from all uploaded data
    const schemas = detectSchemaFromChunks(chunks);

    // Step 2: Check if this is a breakdown/group-by query (single-table or cross-table)
    const isBreakdownQuery = detectCrossTableQuery(query, schemas);

    if (isBreakdownQuery) {
      // First try single-table breakdown (more common and efficient)
      const singleTableResult = await processSingleTableBreakdown(query, chunks, schemas);
      if (singleTableResult && singleTableResult.breakdown && singleTableResult.breakdown.length > 0) {
        return singleTableResult;
      }

      // If single-table fails, try cross-table breakdown
      const crossTableResult = await processCrossTableQuery(query, chunks, schemas);

      if (crossTableResult.breakdown && crossTableResult.breakdown.length > 0) {
        return crossTableResult;
      }
    }

    // Step 3: Check if this needs cross-reference resolution (e.g., "Sales" -> "D001")
    const needsCrossReference = detectCrossReferenceQuery(query, schemas);
    if (needsCrossReference) {
      return await processCrossReferenceQuery(query, chunks, schemas);
    }

    // Step 4: Analyze query with LLM (passing conversation context)
    const analysis = await analyzeQueryWithLLM(query, schemas, conversationContext);

    // Step 4.5: Check if this is a group-by query that wasn't detected earlier
    if (analysis.isAnalytical && analysis.groupByEntity && !isBreakdownQuery) {
      const singleTableResult = await processSingleTableBreakdown(query, chunks, schemas, analysis);
      if (singleTableResult && singleTableResult.breakdown && singleTableResult.breakdown.length > 0) {
        return singleTableResult;
      }
    }

    // Step 5: Find target schema for the query
    const targetSchema = findTargetSchema(analysis.entityType, schemas);
    if (!targetSchema) {
      return {
        message: `No data found for "${analysis.entityType}". Available data types: ${Array.from(schemas.keys()).join(', ')}.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: false
      };
    }

    // Step 6: Process data with filters
    const dataProcessor = new UniversalDataProcessor(schemas);
    const processedData = dataProcessor.processQuery(analysis, chunks);

    // Step 7: Generate intelligent response
    const response = await generateIntelligentResponse(query, analysis, processedData, targetSchema);

    // Step 8: Add conversation context for follow-up queries
    // Extract group-by dimension dynamically from the query for analytical queries
    let groupByDimension = undefined;
    if (analysis.isAnalytical) {
      const groupByPatterns = [
        /per\s+each\s+(\w+)/i,
        /per\s+(\w+)/i,
        /by\s+(\w+)/i,
        /each\s+(\w+)/i,
        /for\s+each\s+(\w+)/i,
        /across\s+\d+\s+(\w+)/i
      ];

      for (const pattern of groupByPatterns) {
        const match = pattern.exec(query);
        if (match && match[1]) {
          groupByDimension = match[1].toLowerCase();
          // Remove plural forms
          if (groupByDimension.endsWith('s') && groupByDimension.length > 3) {
            groupByDimension = groupByDimension.slice(0, -1);
          }
          break;
        }
      }

      // Fallback to analysis.groupByEntity if available
      if (!groupByDimension && analysis.groupByEntity) {
        groupByDimension = analysis.groupByEntity;
      }
    }

    const newConversationContext = {
      lastQuery: query,
      lastFilters: generateFilterDescription(analysis.filters),
      lastEntityType: analysis.entityType,
      lastCount: processedData.count,
      // For breakdown queries, include the dynamically extracted group-by dimension
      lastGroupByDimension: groupByDimension
    };

    return {
      ...response,
      conversationContext: newConversationContext
    };

  } catch (error) {
    console.error(`[UNIVERSAL] Error processing query:`, error);
    return {
      message: `Sorry, I encountered an error while processing your query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }
}
