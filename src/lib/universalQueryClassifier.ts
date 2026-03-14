import { DetectedSchema } from './universalSchemaDetector'

export interface QueryAnalysis {
  intent: string;
  entityType: string;
  operation: 'count' | 'list' | 'filter' | 'group' | 'analyze' | 'acknowledge';
  filters: Record<string, any>;
  groupBy?: string;
  // When the LLM or the rules derive a grouping entity name directly
  // (e.g., "status", "country"), we expose it explicitly so downstream
  // processors can use it to set conversation context.
  groupByEntity?: string;
  isAnalytical: boolean;
  isCountQuery: boolean;
  isListQuery: boolean;
  originalQuery: string;
}

export async function classifyQueryUniversally(
  query: string,
  availableSchemas: Map<string, DetectedSchema>
): Promise<QueryAnalysis> {

  // Get all possible entity types
  const entityTypes = Array.from(availableSchemas.values()).map(s => s.entityType);

  // DYNAMIC entity detection - works with ANY entity type
  const detectedEntity = detectEntityInQuery(query, entityTypes);
  const operation = detectOperation(query);
  const filters = extractFilters(query) || {};

  // Heuristic: if user asks "need a follow-up" or similar and no filter provided,
  // infer a boolean-on filter for any field that semantically matches follow-up semantics.
  const normalized = query.toLowerCase();
  const needsFollowUp = /(need|requires?|require a)\s+(follow\s?-?up|followup)/.test(normalized);
  if (needsFollowUp && Object.keys(filters).length === 0) {
    // Find a likely boolean field from schemas
    const allFields = Array.from(availableSchemas.values()).flatMap(s => s.allFields.map(f => f.toLowerCase()));
    const candidates = allFields.filter(f => /follow[_\s-]?up/.test(f) || /require(d)?/.test(f) || /need(ed)?/.test(f));
    if (candidates.length > 0) {
      // Pick the most specific follow-up field
      const followField = candidates.sort((a, b) => (a.length - b.length))[0];
      // Assume affirmative values are either Yes/True/1
      filters[followField] = 'Yes';
    }
  }
  const groupBy = extractGroupBy(query);

  return {
    intent: `${operation} ${detectedEntity}`,
    entityType: detectedEntity,
    operation,
    filters,
    groupBy,
    groupByEntity: groupBy,
    isAnalytical: operation === 'group' || operation === 'analyze' || !!groupBy,
    isCountQuery: operation === 'count',
    isListQuery: operation === 'list',
    originalQuery: query
  };
}

// Finds ANY entity type in query with intelligent matching
function detectEntityInQuery(query: string, availableEntities: string[]): string {
  const queryLower = query.toLowerCase();

  // Create normalized entity mappings for better matching
  const entityMappings = new Map<string, string>();
  availableEntities.forEach(entity => {
    // Store original entity
    entityMappings.set(entity.toLowerCase(), entity);

    // Store singular forms
    const singular = entity.replace(/s$/, '');
    if (singular !== entity) {
      entityMappings.set(singular.toLowerCase(), entity);
    }

    // Store plural forms
    const plural = entity.endsWith('s') ? entity : entity + 's';
    entityMappings.set(plural.toLowerCase(), entity);

    // Store common variations
    if (entity.includes('row')) {
      const baseEntity = entity.replace('row', '');
      entityMappings.set(baseEntity.toLowerCase(), entity);
      entityMappings.set((baseEntity + 's').toLowerCase(), entity);
    }
  });

  // Direct match with all variations
  for (const [normalizedEntity, originalEntity] of entityMappings) {
    if (queryLower.includes(normalizedEntity)) {
      return originalEntity;
    }
  }

  // Fuzzy matching for close matches
  for (const [normalizedEntity, originalEntity] of entityMappings) {
    if (isCloseMatch(queryLower, normalizedEntity)) {
      return originalEntity;
    }
  }

  // Fallback to first available entity
  return availableEntities[0] || 'item';
}

function detectOperation(query: string): 'count' | 'list' | 'filter' | 'group' | 'analyze' {
  const queryLower = query.toLowerCase();

  // List operations (highest priority)
  if (/list all|show all|show me|display all|what.*do we have|what.*are there|name them|list them|show them|display them|all of them|everyone|everybody/.test(queryLower)) {
    return 'list';
  }

  // Group operations (check for breakdown/grouping patterns) - HIGHER PRIORITY
  if (/per\s+(each\s+)?\w+|by\s+\w+|group\s+by|breakdown|distribution|each\s+\w+|for\s+each\s+\w+/.test(queryLower)) {
    return 'group';
  }

  // Count operations
  if (/how many|count|number of|total/.test(queryLower)) {
    return 'count';
  }

  // Filter operations (check for specific filters)
  if (/(from|in|during|where|with|has|are|is)\s+\w+/.test(queryLower)) {
    return 'filter';
  }

  // Default to count
  return 'count';
}

function extractFilters(query: string): Record<string, any> {
  const filters: Record<string, any> = {};
  const queryLower = query.toLowerCase();

  // Extract year filters
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    filters.year = yearMatch[0];
  }

  // Extract location filters
  const locationMatch = queryLower.match(/(?:from|in)\s+(\w+)/);
  if (locationMatch) {
    filters.country = locationMatch[1];
  }

  // Extract dynamic field filters (data-agnostic)
  const fieldFilterMatch = query.match(/(\w+)[:\s]+(\w+)/i);
  if (fieldFilterMatch) {
    const fieldName = fieldFilterMatch[1].toLowerCase();
    const fieldValue = fieldFilterMatch[2];
    filters[fieldName] = fieldValue;
  }

  // Extract boolean filters (Yes/No)
  if (queryLower.includes('yes') || queryLower.includes('true')) {
    filters.boolean = 'Yes';
  } else if (queryLower.includes('no') || queryLower.includes('false')) {
    filters.boolean = 'No';
  }

  // Extract age filters
  const ageMatch = query.match(/age\s+(\d+)/i);
  if (ageMatch) {
    filters.age = parseInt(ageMatch[1]);
  }

  return filters;
}

function extractGroupBy(query: string): string | undefined {
  // Enhanced group-by extraction patterns (data-agnostic)
  const groupByPatterns = [
    /per\s+each\s+(\w+)/i,  // "per each specialty"
    /per\s+(\w+)/i,         // "per specialty"
    /by\s+(\w+)/i,          // "by specialty"
    /each\s+(\w+)/i,        // "each specialty"
    /for\s+each\s+(\w+)/i,  // "for each specialty"
    /across\s+\d+\s+(\w+)/i, // "across 5 specialties"
    /breakdown\s+by\s+(\w+)/i, // "breakdown by specialty"
    /group\s+by\s+(\w+)/i   // "group by specialty"
  ];

  for (const pattern of groupByPatterns) {
    const match = pattern.exec(query);
    if (match && match[1]) {
      let groupByField = match[1].toLowerCase();

      // Data-agnostic: normalize plural forms only, don't hardcode field names
      if (groupByField.endsWith('s') && groupByField.length > 3) {
        groupByField = groupByField.slice(0, -1);
      }

      return groupByField;
    }
  }

  return undefined;
}

function isCloseMatch(query: string, entity: string): boolean {
  // Simple fuzzy matching
  return query.includes(entity.substring(0, Math.max(3, entity.length - 2)));
}
