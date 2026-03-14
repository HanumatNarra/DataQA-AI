import { DetectedSchema } from './universalSchemaDetector'
import { QueryAnalysis } from './universalQueryClassifier'

export interface ProcessedDataResult {
  entities: any[]
  count: number
  filters?: Record<string, any>
}

export class UniversalDataProcessor {
  private schemas: Map<string, DetectedSchema>
  private allData: any[] = []

  constructor(schemas: Map<string, DetectedSchema>) {
    this.schemas = schemas
  }

  processQuery(queryAnalysis: QueryAnalysis, chunks: any[]): ProcessedDataResult {
    // Check if chunks are already resolved data (from cross-reference processing)
    const isResolvedData = chunks.length > 0 && typeof chunks[0] === 'object' && !chunks[0].chunk_text;

    if (isResolvedData) {
      return this.processResolvedData(queryAnalysis, chunks);
    }

    // Find target schema
    const targetSchema = this.findTargetSchema(queryAnalysis.entityType);
    if (!targetSchema) {
      return {
        entities: [],
        count: 0,
        filters: undefined
      };
    }

    // Get relevant chunks for this schema
    const relevantChunks = chunks.filter(chunk => {
      const chunkFilename = chunk.filename || this.extractFilenameFromContent(chunk);
      return chunkFilename === targetSchema.filename;
    });

    if (relevantChunks.length === 0) {
      return {
        entities: [],
        count: 0,
        filters: undefined
      };
    }
    
    // Parse all chunks to populate allData for cross-reference resolution
    this.allData = chunks.map(chunk => {
      const obj: any = {};
      const pairs = chunk.chunk_text.split(', ');
      
      for (const pair of pairs) {
        const [key, value] = pair.split(': ');
        if (key && value !== undefined) {
          obj[key.trim()] = value.trim();
        }
      }
      
      return obj;
    });
    
    // Use filters from query analysis instead of re-extracting
    return this.processDataWithFilters(queryAnalysis, relevantChunks, targetSchema);
  }

  private processResolvedData(queryAnalysis: QueryAnalysis, resolvedData: any[]): ProcessedDataResult {
    // Filter resolved data based on query analysis filters
    let filteredData = resolvedData;
    if (queryAnalysis.filters && Object.keys(queryAnalysis.filters).length > 0) {
      filteredData = resolvedData.filter(item => {
        return this.matchesQueryFilters(item, queryAnalysis.filters, {
          allFields: Object.keys(item),
          entityType: queryAnalysis.entityType,
          filename: 'resolved'
        } as any);
      });
    }

    return {
      entities: filteredData,
      count: filteredData.length,
      filters: queryAnalysis.filters && Object.keys(queryAnalysis.filters).length > 0 ? queryAnalysis.filters : undefined
    };
  }

  private findTargetSchema(entityType: string): DetectedSchema | undefined {
    return Array.from(this.schemas.values()).find(schema => 
      schema.entityType.toLowerCase() === entityType.toLowerCase()
    );
  }

  private extractFilenameFromContent(chunk: any): string {
    // Extract filename from chunk metadata or content
    return chunk.metadata?.file_name || chunk.filename || 'unknown';
  }

  private parseChunkToObject(chunkText: string): any {
    const obj: any = {};
    const pairs = chunkText.split(', ');
    
    for (const pair of pairs) {
      const [key, value] = pair.split(': ');
      if (key && value !== undefined) {
        obj[key.trim()] = value.trim();
      }
    }
    
    return obj;
  }

  private processDataWithFilters(queryAnalysis: QueryAnalysis, chunks: any[], targetSchema: DetectedSchema): ProcessedDataResult {
    // Filter chunks based on query analysis filters
    let filteredChunks = chunks;
    if (queryAnalysis.filters && Object.keys(queryAnalysis.filters).length > 0) {
      filteredChunks = chunks.filter(chunk => {
        const chunkData = this.parseChunkToObject(chunk.chunk_text);
        return this.matchesQueryFilters(chunkData, queryAnalysis.filters, targetSchema);
      });
    }

    // Parse filtered chunks to entities
    const entities = filteredChunks.map(chunk => this.parseChunkToObject(chunk.chunk_text));

    return {
      entities,
      count: entities.length,
      filters: queryAnalysis.filters && Object.keys(queryAnalysis.filters).length > 0 ? queryAnalysis.filters : undefined
    };
  }

  private matchesQueryFilters(chunk: any, filters: any, schema: DetectedSchema): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    for (const [filterField, filterValueRaw] of Object.entries(filters)) {
      let filterValue: any = filterValueRaw;
      // Find the matching field in the chunk
      const matchingField = this.findMatchingField(filterField, schema.allFields);
      if (!matchingField) {
        return false;
      }

      const chunkValue = chunk[matchingField];

      // Handle dynamic field name resolution
      if (typeof filterValue === 'string' && (filterField.toLowerCase().includes('_id') || filterField.toLowerCase().includes('id'))) {
        // Try to resolve field name to ID dynamically
        const resolvedId = this.resolveFieldNameToId(filterValue, filterField, this.allData || []);
        if (resolvedId) {
          const matches = String(chunkValue).toLowerCase() === resolvedId.toLowerCase();
          if (!matches) return false;
        } else {
          // Fallback to direct comparison
          const matches = String(chunkValue).toLowerCase() === String(filterValue).toLowerCase();
          if (!matches) return false;
        }
      } else if (typeof filterValue === 'object' && filterValue !== null) {
        // Handle complex filter objects
        if (!this.matchesComplexFilter(chunkValue, filterValue)) {
          return false;
        }
      } else {
        // Simple comparison (boolean-aware)
        const normalizeBool = (val: any) => {
          const v = String(val).trim().toLowerCase();
          if (['yes','true','1','y','t'].includes(v)) return 'yes';
          if (['no','false','0','n','f'].includes(v)) return 'no';
          return v;
        };
        const left = normalizeBool(chunkValue);
        const right = normalizeBool(filterValue);
        const matches = left === right || left.includes(right) || right.includes(left);
        if (!matches) return false;
      }
    }

    return true;
  }

  // Dynamic cross-reference resolution - works with any dataset
  private resolveNameToId(name: string, lookupTable: any[], idField: string, nameField: string): string {
    if (!lookupTable || lookupTable.length === 0) {
      return name; // Fallback to original name if no lookup table
    }
    
    // Try exact match first
    const exactMatch = lookupTable.find(item => 
      item[nameField]?.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch[idField];
    }
    
    // Try partial match
    const partialMatch = lookupTable.find(item => 
      item[nameField]?.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(item[nameField]?.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch[idField];
    }
    
    // Fallback to original name
    return name;
  }

  // Generic field resolution - works with any field names
  private resolveFieldValue(name: string, fieldName: string, data: any[]): string {
    if (!data || data.length === 0) {
      return name;
    }
    
    // Try to find a lookup table for this field
    const lookupTable = data.filter(item => item[fieldName]);
    return this.resolveNameToId(name, lookupTable, fieldName, 'name');
  }

  // Dynamic field resolution - works with any dataset
  private resolveFieldNameToId(name: string, fieldName: string, allData: any[]): string | null {
    // Find lookup tables in the data
    const lookupTables = allData.filter(item => 
      item[fieldName] && (item.name || item.title || item.description)
    );
    
    if (lookupTables.length === 0) {
      return null; // No lookup table found
    }
    
    // Determine the name field dynamically
    const nameField = lookupTables[0].name ? 'name' : 
                     lookupTables[0].title ? 'title' : 
                     lookupTables[0].description ? 'description' : 'name';
    
    const resolvedId = this.resolveNameToId(name, lookupTables, fieldName, nameField);
    return resolvedId === name ? null : resolvedId; // Return null if no match found
  }

  // Helper method to handle complex filter objects
  private matchesComplexFilter(chunkValue: any, filterValue: any): boolean {
    if (filterValue.type === 'date_range') {
      return this.matchesDateRangeFilter(chunkValue, filterValue);
    } else if (filterValue.operator) {
      return this.matchesComparisonFilter(chunkValue, filterValue);
    }
    return false;
  }

  private matchesDateRangeFilter(chunkValue: any, filter: { type: string, start: string, end: string }): boolean {
    const { start, end } = filter;
    
    // Parse the chunk date value
    const chunkDate = new Date(String(chunkValue));
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Check if chunk date is within the range (inclusive)
    const isInRange = chunkDate >= startDate && chunkDate <= endDate;
    return isInRange;
  }

  private matchesComparisonFilter(chunkValue: any, filter: { operator: string, value: any }): boolean {
    const { operator, value } = filter;
    
    // Convert values to numbers for numeric comparisons
    const chunkNum = parseFloat(String(chunkValue));
    const filterNum = parseFloat(String(value));
    
    // Check if both values are valid numbers
    const isNumericComparison = !isNaN(chunkNum) && !isNaN(filterNum);
    
    if (isNumericComparison) {
      // Numeric comparison
      switch (operator) {
        case '>':
          return chunkNum > filterNum;
        case '<':
          return chunkNum < filterNum;
        case '>=':
          return chunkNum >= filterNum;
        case '<=':
          return chunkNum <= filterNum;
        case '=':
        case '==':
          return chunkNum === filterNum;
        default:
          return false;
      }
    } else {
      // String comparison
      const chunkStr = String(chunkValue).toLowerCase().trim();
      const filterStr = String(value).toLowerCase().trim();

      switch (operator) {
        case '=':
        case '==':
          return chunkStr === filterStr;
        case '!=':
        case '<>':
          return chunkStr !== filterStr;
        case 'contains':
        case 'like':
          return chunkStr.includes(filterStr);
        default:
          return false;
      }
    }
  }

  private findMatchingField(filterKey: string, availableFields: string[]): string | null {
    const filterKeyLower = filterKey.toLowerCase();
    
    // Direct match
    const directMatch = availableFields.find(field => field.toLowerCase() === filterKeyLower);
    if (directMatch) return directMatch;
    
    // Partial match
    const partialMatch = availableFields.find(field => 
      field.toLowerCase().includes(filterKeyLower) || 
      filterKeyLower.includes(field.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Dynamic semantic matching (data-agnostic)
    const semanticMatches: Record<string, string[]> = {
      'status': ['status', 'state', 'condition', 'phase'],
      'location': ['location', 'country', 'region', 'area', 'zone'],
      'date': ['date', 'created', 'updated', 'timestamp', 'time'],
      'name': ['name', 'title', 'label', 'description'],
      'id': ['id', 'key', 'identifier', 'code'],
      'amount': ['amount', 'total', 'cost', 'price', 'value', 'sum'],
      'quantity': ['quantity', 'qty', 'count', 'number', 'total'],
      'size': ['size', 'count', 'quantity', 'number'],
      'group': ['group', 'category', 'type', 'class', 'division'],
      'type': ['type', 'category', 'group', 'class', 'kind']
    };
    
    for (const [semanticKey, synonyms] of Object.entries(semanticMatches)) {
      if (semanticKey === filterKeyLower || synonyms.includes(filterKeyLower)) {
        const match = availableFields.find(field => 
          synonyms.some(synonym => field.toLowerCase().includes(synonym))
        );
        if (match) return match;
      }
    }
    
    // Handle underscore variations (e.g., "team_size" vs "team size")
    const underscoreVariation = filterKeyLower.replace(/\s+/g, '_');
    const spaceVariation = filterKeyLower.replace(/_/g, ' ');
    
    const underscoreMatch = availableFields.find(field => 
      field.toLowerCase() === underscoreVariation || 
      field.toLowerCase() === spaceVariation
    );
    if (underscoreMatch) return underscoreMatch;
    
    return null;
  }
}
