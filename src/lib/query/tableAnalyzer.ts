import { DetectedSchema } from '../universalSchemaDetector'
import { QueryAnalysis } from '../universalQueryClassifier'
import { UniversalResponse } from './queryProcessor'
import { analyzeSingleTableBreakdown, analyzeCrossTableQueryWithLLM } from './queryClassifier'
import { generateSingleTableBreakdownResponse, generateCrossTableResponse } from './responseFormatter'

/**
 * Processes a single-table breakdown query
 */
export async function processSingleTableBreakdown(
  query: string,
  chunks: any[],
  schemas: Map<string, DetectedSchema>,
  llmAnalysis?: QueryAnalysis
): Promise<UniversalResponse> {
  try {
    // Use LLM analysis if available, otherwise do our own analysis
    let analysis;
    if (llmAnalysis && llmAnalysis.groupByEntity) {
      analysis = {
        primaryEntity: llmAnalysis.entityType,
        groupByEntity: llmAnalysis.groupByEntity
      };
    } else {
      // Extract the main entity and group-by field from the query
      analysis = await analyzeSingleTableBreakdown(query, schemas);
    }

    if (!analysis.primaryEntity || !analysis.groupByEntity) {
      return {
        message: `I couldn't understand what you want to group by. Please try rephrasing your question.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }

    // Find the schema for the primary entity
    const targetSchema = Array.from(schemas.entries()).find(([, schema]) =>
      schema.entityType.toLowerCase() === analysis.primaryEntity.toLowerCase()
    );

    if (!targetSchema) {
      return {
        message: `I couldn't find data for ${analysis.primaryEntity}. Available data types: ${Array.from(schemas.keys()).join(', ')}.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }

    const [filename, schema] = targetSchema;

    // Get data for this schema
    const relevantChunks = chunks.filter(chunk => {
      const chunkFilename = chunk.filename || chunk.metadata?.file_name || 'unknown';
      return chunkFilename === filename;
    });

    if (relevantChunks.length === 0) {
      return {
        message: `No data found for ${analysis.primaryEntity}.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }

    // Parse chunks to data objects
    const data = parseChunksToObjects(relevantChunks);

    // Find the group-by field in the schema
    let groupByField = analysis.groupByEntity;
    if (!schema.allFields.includes(groupByField)) {
      // Try to find a similar field
      const matchingField = findMatchingField(groupByField, schema.allFields);

      if (matchingField) {
        groupByField = matchingField;
      } else {
        return {
          message: `I couldn't find a field called "${analysis.groupByEntity}" in the ${analysis.primaryEntity} data. Available fields: ${schema.allFields.join(', ')}.`,
          count: 0,
          isCountQuery: false,
          isListQuery: false,
          isAnalyticalQuery: true
        };
      }
    }

    // Group data by the field
    const groupedData = groupDataByField(data, groupByField);

    // Generate breakdown response
    const breakdown = Array.from(groupedData.entries()).map(([groupName, items]) => ({
      group: groupName,
      count: items.length,
      items: items
    }));

    const totalCount = data.length;

    // Use proper pluralization for grammar
    const primaryEntityPlural = toPlural(analysis.primaryEntity);
    const groupByEntityPlural = toPlural(analysis.groupByEntity);

    const breakdownText = breakdown.map(item =>
      `${item.count} ${primaryEntityPlural} in ${item.group}`
    ).join(', ');

    const message = `There are ${totalCount} ${primaryEntityPlural} across ${breakdown.length} ${groupByEntityPlural}: ${breakdownText}.`;

    return {
      message,
      count: totalCount,
      breakdown,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: true
    };

  } catch (error) {
    console.error(`[UNIVERSAL] Error in single-table breakdown:`, error);
    return {
      message: `Sorry, I encountered an error while processing the breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: true
    };
  }
}

/**
 * Processes a cross-table query (multi-table joins)
 */
export async function processCrossTableQuery(
  query: string,
  chunks: any[],
  schemas: Map<string, DetectedSchema>
): Promise<UniversalResponse> {
  try {
    // Group chunks by schema
    const chunksBySchema: Record<string, any[]> = {};
    for (const [filename] of schemas.entries()) {
      const schemaChunks = chunks.filter(chunk => {
        const chunkFilename = chunk.filename || chunk.metadata?.file_name || 'unknown';
        return chunkFilename === filename;
      });
      chunksBySchema[filename] = schemaChunks;
    }

    // Parse all chunks into structured data
    const dataBySchema: Record<string, any[]> = {};
    for (const [filename, schemaChunks] of Object.entries(chunksBySchema)) {
      dataBySchema[filename] = parseChunksToObjects(schemaChunks);
    }

    // Use LLM to analyze and join the data
    const analysis = await analyzeCrossTableQueryWithLLM(query, dataBySchema, schemas);

    // Handle single-table breakdowns differently
    if (analysis.isSingleTable) {
      const response = await generateSingleTableBreakdownResponse(query, analysis, dataBySchema, schemas);
      return {
        ...response,
        conversationContext: {
          lastQuery: query,
          lastFilters: 'single-table breakdown',
          lastEntityType: analysis.primaryEntity,
          lastGroupByDimension: analysis.groupByEntity,
          lastCount: response.count || 0
        }
      };
    }

    // Generate response based on the analysis for multi-table joins
    const response = await generateCrossTableResponse(query, analysis, dataBySchema, schemas);

    return {
      ...response,
      conversationContext: {
        lastQuery: query,
        lastFilters: 'cross-table analysis',
        lastEntityType: 'multiple',
        lastCount: analysis.totalCount || 0
      }
    };

  } catch (error) {
    console.error(`[UNIVERSAL] Error in cross-table processing:`, error);
    return {
      message: `Sorry, I encountered an error while processing the cross-table query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }
}

/**
 * Processes a cross-reference query (name-to-ID resolution)
 */
export async function processCrossReferenceQuery(
  query: string,
  chunks: any[],
  schemas: Map<string, DetectedSchema>
): Promise<UniversalResponse> {
  try {
    // Group chunks by schema
    const chunksBySchema = new Map<string, any[]>();
    for (const [filename] of schemas.entries()) {
      const schemaChunks = chunks.filter(chunk => {
        const chunkFilename = chunk.filename || chunk.metadata?.file_name || 'unknown';
        return chunkFilename === filename;
      });
      chunksBySchema.set(filename, schemaChunks);
    }

    // Parse all chunks into structured data
    const dataBySchema = new Map<string, any[]>();
    for (const [filename, schemaChunks] of chunksBySchema.entries()) {
      dataBySchema.set(filename, parseChunksToObjects(schemaChunks));
    }

    // Resolve cross-references
    const resolvedData = await resolveCrossReferencesWithLLM(query, dataBySchema, schemas);

    return {
      message: `Found ${resolvedData.length} records matching your query.`,
      count: resolvedData.length,
      items: resolvedData.map((item: any) => JSON.stringify(item)),
      isCountQuery: false,
      isListQuery: true,
      isAnalyticalQuery: false,
      conversationContext: {
        lastQuery: query,
        lastFilters: 'cross-reference resolved',
        lastEntityType: 'resolved',
        lastCount: resolvedData.length
      }
    };

  } catch (error) {
    console.error(`[UNIVERSAL] Error in cross-reference processing:`, error);
    return {
      message: `Sorry, I encountered an error while processing the cross-reference query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }
}

/**
 * Resolves cross-references (e.g., "Sales" -> "D001")
 */
async function resolveCrossReferencesWithLLM(
  query: string,
  dataBySchema: Map<string, any[]>,
  schemas: Map<string, DetectedSchema>
): Promise<any[]> {
  try {
    // Extract the name-based reference from the query with data-agnostic patterns
    const namePatterns = [
      /(\w+)\s+\w+/i,
      /\w+\s+(\w+)/i,
      /belong\s+to\s+the\s+(\w+)/i,
      /in\s+the\s+(\w+)/i,
      /from\s+the\s+(\w+)/i
    ];

    let referencedName = null;
    for (const pattern of namePatterns) {
      const match = pattern.exec(query);
      if (match) {
        const name = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        // Validate the name
        const commonWords = ['the', 'a', 'an', 'in', 'of', 'from', 'to', 'with', 'by', 'for', 'all', 'any', 'some', 'many', 'how', 'what', 'which', 'where', 'when', 'why', 'each', 'per'];
        const isValidName = name &&
                           name.trim().length > 0 &&
                           !commonWords.includes(name.toLowerCase()) &&
                           !/^\d+$/.test(name) &&
                           name.length > 1;

        if (isValidName) {
          referencedName = name;
          break;
        }
      }
    }

    if (!referencedName) {
      return Array.from(dataBySchema.values()).flat();
    }

    // Determine if this is a reference query (data-agnostic)
    const isReferenceQuery = /department|region|category|group|type/i.test(query);

    // Find lookup table based on query type (data-agnostic)
    let lookupTable = null;
    if (isReferenceQuery) {
      // Find small tables that are likely lookup tables
      lookupTable = Array.from(schemas.entries()).find(([, schema]) =>
        schema.allFields.length <= 5 &&
        schema.allFields.some(field =>
          field.toLowerCase().includes('name') ||
          field.toLowerCase().includes('title')
        )
      );
    }

    if (!lookupTable) {
      return Array.from(dataBySchema.values()).flat();
    }

    const [lookupFile, lookupSchema] = lookupTable;
    const lookupData = dataBySchema.get(lookupFile) || [];

    // Find the ID for the referenced name
    const referencedId = findIdByName(lookupData, referencedName, lookupSchema);

    if (!referencedId) {
      return [];
    }

    // Find main table with ID references - MUST be different from lookup table (data-agnostic)
    let mainTable = null;
    if (isReferenceQuery) {
      mainTable = Array.from(schemas.entries()).find(([, schema]) =>
        schema.allFields.some(field => field.toLowerCase().includes('_id')) &&
        schema.allFields.length > 5
      );
    }

    if (!mainTable) {
      return Array.from(dataBySchema.values()).flat();
    }

    const [mainFile, mainSchema] = mainTable;
    const mainData = dataBySchema.get(mainFile) || [];

    // Determine the ID field name
    const idFieldName = determineIdFieldName(query, mainSchema);

    // Filter main data by the resolved ID
    const filteredData = mainData.filter(item => {
      const itemId = item[idFieldName];
      return itemId && itemId.toLowerCase() === referencedId.toLowerCase();
    });

    return filteredData;

  } catch (error) {
    console.error(`[UNIVERSAL] Error in cross-reference resolution:`, error);
    return Array.from(dataBySchema.values()).flat();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses chunks into data objects
 */
export function parseChunksToObjects(chunks: any[]): any[] {
  return chunks.map(chunk => {
    const obj: Record<string, any> = {};
    const pairs = chunk.chunk_text.split(', ');

    for (const pair of pairs) {
      const [key, value] = pair.split(': ');
      if (key && value !== undefined) {
        obj[key.trim()] = value.trim();
      }
    }

    return obj;
  });
}

/**
 * Groups data by a specific field
 */
export function groupDataByField(data: any[], field: string): Map<string, any[]> {
  const groupedData = new Map<string, any[]>();

  for (const item of data) {
    const groupValue = item[field] || 'Unknown';
    if (!groupedData.has(groupValue)) {
      groupedData.set(groupValue, []);
    }
    groupedData.get(groupValue)!.push(item);
  }

  return groupedData;
}

/**
 * Finds a matching field in the schema
 */
export function findMatchingField(targetField: string, schemaFields: string[]): string | null {
  const targetLower = targetField.toLowerCase();

  return schemaFields.find(field =>
    field.toLowerCase() === targetLower ||
    field.toLowerCase().includes(targetLower) ||
    targetLower.includes(field.toLowerCase())
  ) || null;
}

/**
 * Finds ID by name in lookup tables
 */
export function findIdByName(lookupData: any[], name: string, schema: DetectedSchema): string | null {
  const nameField = schema.nameField || 'name';
  const idField = schema.primaryField;

  for (const record of lookupData) {
    const recordName = record[nameField];
    if (recordName && recordName.toLowerCase() === name.toLowerCase()) {
      return record[idField];
    }
  }

  return null;
}

/**
 * Data-agnostic pluralization function
 */
export function toPlural(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x')) {
    return word + 'es';
  } else {
    return word + 's';
  }
}

/**
 * Determines the ID field name based on query context (data-agnostic)
 */
export function determineIdFieldName(query: string, schema: DetectedSchema): string {
  // Look for any field that contains '_id' and matches the query context
  const queryLower = query.toLowerCase();
  const idField = schema.allFields.find(field =>
    field.toLowerCase().includes('_id') &&
    queryLower.includes(field.toLowerCase().replace('_id', ''))
  );

  if (idField) {
    return idField;
  }

  // Fallback to any '_id' field
  const anyIdField = schema.allFields.find(field => field.toLowerCase().includes('_id'));
  if (anyIdField) {
    return anyIdField;
  }

  // Default to the primary field
  return schema.primaryField;
}
