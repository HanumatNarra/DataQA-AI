import { DetectedSchema } from '../universalSchemaDetector'
import { classifyQueryUniversally, QueryAnalysis } from '../universalQueryClassifier'
import { OpenAI } from 'openai'

// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

/**
 * Detects if a query requires cross-table analysis (breakdowns or joins)
 */
export function detectCrossTableQuery(query: string, schemas: Map<string, DetectedSchema>): boolean {
  const lowerQuery = query.toLowerCase();

  // Check for cross-table indicators (data-agnostic patterns)
  const crossTableIndicators = [
    'per',
    'by',
    'breakdown by',
    'group by',
    'each',
    'across',
    'from each',
    'in each',
    'for each'
  ];

  const hasCrossTableIndicator = crossTableIndicators.some(indicator =>
    lowerQuery.includes(indicator)
  );

  // Also check for "how many X per Y" or "how many X in each Y" patterns
  const breakdownPatterns = [
    /how many .+ per .+/i,
    /how many .+ per each .+/i,
    /how many .+ in each .+/i,
    /how many .+ from each .+/i,
    /how many .+ for each .+/i,
    /count .+ per .+/i,
    /count .+ per each .+/i,
    /count .+ by .+/i
  ];

  const hasBreakdownPattern = breakdownPatterns.some(pattern =>
    pattern.test(query)
  );

  // Check if we have multiple schemas that could be joined
  const hasMultipleSchemas = schemas.size > 1;

  // Check for entity relationships (data-agnostic)
  const hasRelatedEntities = Array.from(schemas.values()).some(schema =>
    schema.allFields.some(field =>
      field.toLowerCase().includes('id') ||
      field.toLowerCase().includes('_id') ||
      field.toLowerCase().includes('key') ||
      field.toLowerCase().includes('reference')
    )
  );

  // Check if the query is asking for breakdown by fields that exist in the same table
  const fieldPatterns = [
    /per\s+each\s+(\w+)/i,
    /per\s+(\w+)/i,
    /by\s+(\w+)/i,
    /each\s+(\w+)/i,
    /in\s+each\s+(\w+)/i,
    /from\s+each\s+(\w+)/i,
    /for\s+each\s+(\w+)/i
  ];

  const potentialFields: string[] = [];
  fieldPatterns.forEach(pattern => {
    const match = pattern.exec(query);
    if (match && match[1]) {
      potentialFields.push(match[1].toLowerCase());
    }
  });

  // Check if the group-by fields exist in the same table as the main entity
  let hasSameTableFields = false;
  let targetEntity = null;

  // First, try to identify the main entity from the query
  const entityPatterns = [
    /how many (\w+)/i,
    /count (\w+)/i,
    /(\w+) per/i,
    /(\w+) by/i
  ];

  for (const pattern of entityPatterns) {
    const match = pattern.exec(query);
    if (match && match[1]) {
      const entityName = match[1].toLowerCase();
      // Remove plural forms
      const singularEntity = entityName.endsWith('s') ? entityName.slice(0, -1) : entityName;

      // Find the schema for this entity
      targetEntity = Array.from(schemas.values()).find(schema =>
        schema.entityType.toLowerCase() === singularEntity ||
        schema.entityType.toLowerCase() === entityName
      );

      if (targetEntity) {
        break;
      }
    }
  }

  // If we found the target entity, check if the group-by fields exist in that table
  if (targetEntity) {
    const targetFields = targetEntity.allFields.map(f => f.toLowerCase());
    hasSameTableFields = potentialFields.some(field => targetFields.includes(field));
  } else {
    // Fallback: check if any table has the fields
    hasSameTableFields = Array.from(schemas.values()).some(schema => {
      const schemaFields = schema.allFields.map(f => f.toLowerCase());
      return potentialFields.some(field => schemaFields.includes(field));
    });
  }

  // For single-table breakdowns, we need the breakdown pattern and fields in the same table
  const isSingleTableBreakdown = (hasCrossTableIndicator || hasBreakdownPattern) && hasSameTableFields;

  // For multi-table joins, we need multiple schemas AND fields in different tables
  const isMultiTableJoin = (hasCrossTableIndicator || hasBreakdownPattern) && hasMultipleSchemas && hasRelatedEntities && !hasSameTableFields;

  // Prioritize single-table breakdowns over multi-table joins
  return isSingleTableBreakdown || isMultiTableJoin;
}

/**
 * Detects if a query requires cross-reference resolution (e.g., "Sales" -> "D001")
 */
export function detectCrossReferenceQuery(query: string, schemas: Map<string, DetectedSchema>): boolean {
  const explicitNamePatterns = [
    /(\w+)\s+department/i,
    /department\s+(\w+)/i,
    /(\w+)\s+region/i,
    /region\s+(\w+)/i,
    /(\w+)\s+category/i,
    /category\s+(\w+)/i
  ];

  const hasExplicitNameReference = explicitNamePatterns.some(pattern => {
    const match = pattern.exec(query);
    if (match) {
      const name = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
      const commonWords = ['the', 'a', 'an', 'in', 'of', 'from', 'to', 'with', 'by', 'for', 'all', 'any', 'some', 'many', 'how', 'what', 'which', 'where', 'when', 'why', 'each', 'per'];

      const isValidName = name &&
                         name.trim().length > 0 &&
                         !commonWords.includes(name.toLowerCase()) &&
                         !/^\d+$/.test(name) &&
                         name.length > 1;

      return !!isValidName;
    }
    return false;
  });

  // Check if we have multiple schemas that could be related
  const hasMultipleSchemas = schemas.size > 1;

  // Check if we have lookup tables (data-agnostic)
  const hasLookupTables = Array.from(schemas.values()).some(schema =>
    schema.allFields.length <= 5 &&
    schema.allFields.some(field =>
      field.toLowerCase().includes('name') ||
      field.toLowerCase().includes('title') ||
      field.toLowerCase().includes('description')
    )
  );

  // Check if we have main tables with ID references (data-agnostic)
  const hasMainTablesWithIds = Array.from(schemas.values()).some(schema =>
    schema.allFields.some(field =>
      field.toLowerCase().includes('_id') ||
      field.toLowerCase().includes('_key') ||
      field.toLowerCase().includes('reference')
    )
  );

  // Additional check: Don't trigger cross-reference for simple filter queries
  const isSimpleFilterQuery = /\w+s?\s+(in|from)\s+(the\s+)?(\w+)/i.test(query) ||
                             /\w+s?\s+(in|from)\s+(the\s+)?(\w+)\s+(\w+)/i.test(query);

  return hasExplicitNameReference && hasMultipleSchemas && hasLookupTables && hasMainTablesWithIds && !isSimpleFilterQuery;
}

/**
 * Analyzes a query using LLM with conversation context
 */
export async function analyzeQueryWithLLM(query: string, schemas: Map<string, DetectedSchema>, conversationContext?: any): Promise<QueryAnalysis> {
  const schemaInfo = Array.from(schemas.entries()).map(([file, schema]) =>
    `${file}: ${schema.entityType} (${schema.allFields.join(', ')})`
  ).join('\n');

  // Build context-aware prompt
  let contextInfo = '';
  if (conversationContext && conversationContext.lastQuery && conversationContext.lastFilters) {
    contextInfo = `

CONVERSATION CONTEXT:
Previous Query: "${conversationContext.lastQuery}"
Previous Filters: "${conversationContext.lastFilters}"
Previous Entity Type: "${conversationContext.lastEntityType}"
Previous Count: ${conversationContext.lastCount}

IMPORTANT: If the current query is a follow-up that references the previous context (using words like "them", "these", "said", "previous", etc.), you should:
1. Combine the current query with the previous filters
2. Apply the current query's conditions to the previously filtered data
3. Maintain the context from the previous query

SPECIAL CASES FOR SYSTEM FOLLOW-UPS:
- If the current query is "yes", "sure", "okay", "ok", or "please" → Convert to a LIST query for the previous entity with previous filters
- If the current query is "no" → Provide a simple acknowledgment response
- If the current query contains "show", "list", "display", "see", "view" → Convert to a LIST query for the previous entity with previous filters

Example:
- Previous: "How many products do we have that fall under the sports category?" (15 products)
- Current: "How many of these said 15 products have a rating higher than 4.0?"
- Should be interpreted as: "How many products have category='sports' AND rating > 4.0?"

System Follow-up Example:
- Previous: "There are 6 sports products with a rating higher than 4.0. Would you like to see the list of these products?"
- Current: "Yes"
- Should be interpreted as: "List all products where category='sports' AND rating > 4.0"
`;
  }

  const prompt = `Analyze this user query and provide structured understanding:${contextInfo}

Query: "${query}"

Available data schemas:
${schemaInfo}

Please respond with ONLY a JSON object containing:
{
  "intent": "what the user wants to know",
  "entityType": "the main entity being queried (order, customer, product, project, etc.)",
  "operation": "count|list|filter|group|analyze",
  "filters": {
    "field_name": "exact_value" OR {"operator": ">|<|>=|<=|=", "value": "numeric_or_string_value"} OR {"type": "date_range", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  },
  "groupByEntity": "the field to group by (for group/analyze operations)",
  "isAnalytical": true/false,
  "isCountQuery": true/false,
  "isListQuery": true/false,
  "originalQuery": "${query}"
}

IMPORTANT RULES:
1. For queries asking "how many X per Y" or "how many X in each Y" or "X per Y" - these are ANALYTICAL queries that need grouping
2. For queries asking "list X from Y" or "show X in Y" - these are LIST queries
3. For queries asking "how many X" - these are COUNT queries
4. For queries asking "X in Y location" or "X in Y group" - these are FILTER queries
5. Be consistent with similar phrasings - "in each group" and "per each group" should be treated the same
6. For location/group filter queries, extract the location/group name as a filter value
7. For follow-up queries with context, combine the current query conditions with previous filters

IMPORTANT: For date and month queries, use this format:
- "June 2024" → {"type": "date_range", "start": "2024-06-01", "end": "2024-06-30"}
- "April 2024" → {"type": "date_range", "start": "2024-04-01", "end": "2024-04-30"}
- "2024-06" → {"type": "date_range", "start": "2024-06-01", "end": "2024-06-30"}
- "in 2024" → {"type": "date_range", "start": "2024-01-01", "end": "2024-12-31"}

For comparison operators, use this format:
- "larger than 5" → {"operator": ">", "value": "5"}
- "less than 50000" → {"operator": "<", "value": "50000"}
- "equal to Cancelled" → {"operator": "=", "value": "Cancelled"}

Examples:
- "How many items do we have?" → {"intent": "count total items", "entityType": "item", "operation": "count", "filters": {}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": true, "isListQuery": false}
- "How many records are there in each group?" → {"intent": "analyze records by group", "entityType": "record", "operation": "analyze", "filters": {}, "groupByEntity": "group", "isAnalytical": true, "isCountQuery": false, "isListQuery": false}
- "How many records are there per each group?" → {"intent": "analyze records by group", "entityType": "record", "operation": "analyze", "filters": {}, "groupByEntity": "group", "isAnalytical": true, "isCountQuery": false, "isListQuery": false}
- "Can you list all the records in the main group?" → {"intent": "list records by group", "entityType": "record", "operation": "list", "filters": {"group_id": "main"}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- "Can you list all the records from the secondary group?" → {"intent": "list records by group", "entityType": "record", "operation": "list", "filters": {"group_id": "secondary"}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- "Records in June 2024" → {"intent": "filter records by month", "entityType": "record", "operation": "filter", "filters": {"date": {"type": "date_range", "start": "2024-06-01", "end": "2024-06-30"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- "Records with size larger than 5" → {"intent": "filter records by size", "entityType": "record", "operation": "filter", "filters": {"size": {"operator": ">", "value": "5"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- "Records with status active" → {"intent": "filter records by status", "entityType": "record", "operation": "filter", "filters": {"status": {"operator": "=", "value": "active"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- "List records in primary group" → {"intent": "list records by group", "entityType": "record", "operation": "list", "filters": {"group_id": "primary"}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}

CONTEXT-AWARE EXAMPLES:
- Previous: "How many items do we have that fall under the main category?" (15 items)
- Current: "How many of these said 15 items have a score higher than 4.0?" → {"intent": "count main items with high score", "entityType": "item", "operation": "count", "filters": {"category": "main", "score": {"operator": ">", "value": "4.0"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": true, "isListQuery": false}

SYSTEM FOLLOW-UP EXAMPLES:
- Previous: "There are 6 main items with a score higher than 4.0. Would you like to see the list of these items?"
- Current: "Yes" → {"intent": "list main items with high score", "entityType": "item", "operation": "list", "filters": {"category": "main", "score": {"operator": ">", "value": "4.0"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}
- Current: "No" → {"intent": "acknowledge decline", "entityType": "item", "operation": "acknowledge", "filters": {}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": false}
- Current: "Show me" → {"intent": "list main items with high score", "entityType": "item", "operation": "list", "filters": {"category": "main", "score": {"operator": ">", "value": "4.0"}}, "groupByEntity": null, "isAnalytical": false, "isCountQuery": false, "isListQuery": true}`;

  if (!openai) {
    return classifyQueryUniversally(query, schemas);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        originalQuery: query
      };
    } catch (parseError) {
      console.error(`[UNIVERSAL] Failed to parse LLM response:`, parseError);
      throw new Error('Invalid JSON response from LLM');
    }
  } catch (error) {
    console.error(`[UNIVERSAL] LLM analysis failed:`, error);

    // Fallback to rule-based classification
    return classifyQueryUniversally(query, schemas);
  }
}

/**
 * Analyzes cross-table queries with LLM
 */
export async function analyzeCrossTableQueryWithLLM(query: string, dataBySchema: Record<string, any[]>, schemas: Map<string, DetectedSchema>): Promise<any> {
  const schemaInfo = Array.from(schemas.entries()).map(([file, schema]) =>
    `${file}: ${schema.entityType} (${schema.allFields.join(', ')})`
  ).join('\n');

  const dataSummary = Object.entries(dataBySchema).map(([file, data]) =>
    `${file}: ${data.length} records`
  ).join('\n');

  const prompt = `Analyze this query and provide structured understanding. This could be a single-table breakdown (like items by category) or a multi-table join (like records per group):

Query: "${query}"

Available schemas:
${schemaInfo}

Available data:
${dataSummary}

IMPORTANT: For single-table breakdowns, the joinFields.primaryTable should be the actual field name from the schema that matches the groupByEntity. For example, if grouping by "country", use "country" as the field name. If grouping by "status", use "status" as the field name.

Please respond with ONLY a JSON object containing:
{
  "intent": "what the user wants to know",
  "primaryEntity": "main entity being queried (customer, employee, etc.)",
  "groupByEntity": "entity to group by (country, department, etc.)",
  "operation": "count|list|breakdown|group",
  "joinFields": {
    "primaryTable": "field_name_from_schema",
    "groupByTable": "field_name_from_schema"
  },
  "isBreakdownQuery": true/false,
  "isGroupQuery": true/false,
  "isSingleTable": true/false
}

Examples:
- "How many records per group?" → {"intent": "count records grouped by group", "primaryEntity": "record", "groupByEntity": "group", "operation": "breakdown", "joinFields": {"primaryTable": "group_id", "groupByTable": "group_id"}, "isBreakdownQuery": true, "isGroupQuery": false, "isSingleTable": false}
- "How many items per category?" → {"intent": "count items grouped by category", "primaryEntity": "item", "groupByEntity": "category", "operation": "breakdown", "joinFields": {"primaryTable": "category", "groupByTable": "category"}, "isBreakdownQuery": true, "isGroupQuery": false, "isSingleTable": true}
- "How many orders per status?" → {"intent": "count orders grouped by status", "primaryEntity": "order", "groupByEntity": "status", "operation": "breakdown", "joinFields": {"primaryTable": "status", "groupByTable": "status"}, "isBreakdownQuery": true, "isGroupQuery": false, "isSingleTable": true}
- "How many customers per country?" → {"intent": "count customers grouped by country", "primaryEntity": "customer", "groupByEntity": "country", "operation": "breakdown", "joinFields": {"primaryTable": "country", "groupByTable": "country"}, "isBreakdownQuery": true, "isGroupQuery": false, "isSingleTable": true}`;

  if (!openai) {
    // Try to determine if this is a single-table breakdown
    const isSingleTable = schemas.size === 1;

    // Extract potential group-by fields from the query
    const groupByPatterns = [
      /per\s+(\w+)/i,
      /by\s+(\w+)/i,
      /each\s+(\w+)/i,
      /in\s+each\s+(\w+)/i,
      /from\s+each\s+(\w+)/i,
      /for\s+each\s+(\w+)/i
    ];

    let groupByField = null;
    for (const pattern of groupByPatterns) {
      const match = pattern.exec(query);
      if (match && match[1]) {
        groupByField = match[1].toLowerCase();
        break;
      }
    }

    // Try to find the primary entity from available schemas
    const primaryEntity = Array.from(schemas.values())[0]?.entityType || 'data';

    if (isSingleTable && groupByField) {
      return {
        intent: `count ${primaryEntity} grouped by ${groupByField}`,
        primaryEntity: primaryEntity,
        groupByEntity: groupByField,
        operation: "breakdown",
        joinFields: { primaryTable: groupByField, groupByTable: groupByField },
        isBreakdownQuery: true,
        isGroupQuery: false,
        isSingleTable: true
      };
    }

    return {
      intent: "cross-table analysis",
      primaryEntity: "employee",
      groupByEntity: "department",
      operation: "breakdown",
      joinFields: { primaryTable: "department_id", groupByTable: "department_id" },
      isBreakdownQuery: true,
      isGroupQuery: false,
      isSingleTable: false
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a cross-table query analysis assistant. Respond with ONLY valid JSON for analyzing queries that require joining multiple tables."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.1
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from LLM");
    }

    const analysis = JSON.parse(response);
    return analysis;
  } catch (error) {
    console.error(`[UNIVERSAL] Cross-table LLM analysis failed:`, error);
    return {
      intent: "cross-table analysis",
      primaryEntity: "employee",
      groupByEntity: "department",
      operation: "breakdown",
      isBreakdownQuery: true,
      isGroupQuery: false
    };
  }
}

/**
 * Analyzes a single-table breakdown query
 */
export async function analyzeSingleTableBreakdown(query: string, schemas: Map<string, DetectedSchema>): Promise<{
  primaryEntity: string;
  groupByEntity: string;
}> {
  try {
    // Extract primary entity
    let primaryEntity = '';
    const entityPatterns = [
      /how many (\w+)/i,
      /count (\w+)/i,
      /(\w+) per/i,
      /(\w+) by/i
    ];

    for (const pattern of entityPatterns) {
      const match = pattern.exec(query);
      if (match && match[1]) {
        const entityName = match[1].toLowerCase();
        // Remove plural forms
        const singularEntity = entityName.endsWith('s') ? entityName.slice(0, -1) : entityName;

        // Check if this entity exists in our schemas
        const exists = Array.from(schemas.values()).some(schema =>
          schema.entityType.toLowerCase() === singularEntity ||
          schema.entityType.toLowerCase() === entityName
        );

        if (exists) {
          primaryEntity = singularEntity;
          break;
        }
      }
    }

    // Extract group-by entity
    let groupByEntity = '';
    const groupByPatterns = [
      /per\s+each\s+(\w+)/i,
      /per\s+(\w+)/i,
      /by\s+(\w+)/i,
      /each\s+(\w+)/i,
      /for\s+each\s+(\w+)/i,
      /across\s+\d+\s+(\w+)/i,
      /breakdown\s+by\s+(\w+)/i,
      /group\s+by\s+(\w+)/i
    ];

    for (const pattern of groupByPatterns) {
      const match = pattern.exec(query);
      if (match && match[1]) {
        let groupByField = match[1].toLowerCase();

        // Data-agnostic: normalize plural forms only, don't hardcode field names
        if (groupByField.endsWith('s') && groupByField.length > 3) {
          groupByField = groupByField.slice(0, -1);
        }

        groupByEntity = groupByField;
        break;
      }
    }

    return {
      primaryEntity,
      groupByEntity
    };

  } catch (error) {
    console.error(`[UNIVERSAL] Error analyzing single-table breakdown:`, error);
    return {
      primaryEntity: '',
      groupByEntity: ''
    };
  }
}

/**
 * Utility function to find a target schema by entity type
 */
export function findTargetSchema(entityType: string, schemas: Map<string, DetectedSchema>): DetectedSchema | null {
  for (const [, schema] of schemas.entries()) {
    if (schema.entityType.toLowerCase() === entityType.toLowerCase()) {
      return schema;
    }
  }
  return null;
}

/**
 * Generates a filter description for conversation context
 */
export function generateFilterDescription(filters: any): string {
  if (!filters || Object.keys(filters).length === 0) {
    return '';
  }

  const descriptions = Object.entries(filters).map(([field, value]) => {
    if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'date_range') {
      return `${field} from ${(value as any).start} to ${(value as any).end}`;
    } else if (typeof value === 'object' && value !== null && 'operator' in value) {
      return `${field} ${(value as any).operator} ${(value as any).value}`;
    } else {
      return `${field} = ${value}`;
    }
  });

  return descriptions.join(' and ');
}
