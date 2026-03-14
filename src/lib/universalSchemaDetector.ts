export interface DetectedSchema {
  entityType: string;
  primaryField: string;
  nameField: string;
  allFields: string[];
  sampleData: Record<string, any>[];
  filename: string;
}

export function detectSchemaFromChunks(chunks: any[]): Map<string, DetectedSchema> {
  const schemaMap = new Map<string, DetectedSchema>();

  // Group by filename - ENSURE filename is preserved
  const chunksByFile = chunks.reduce((acc, chunk) => {
    const filename = chunk.filename || extractFilenameFromContent(chunk) || 'data';
    if (!acc[filename]) acc[filename] = [];
    acc[filename].push(chunk);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [filename, fileChunks] of Object.entries(chunksByFile)) {
    const schema = analyzeFileSchema(filename, fileChunks as any[]);
    schemaMap.set(filename, schema);
  }

  return schemaMap;
}

function analyzeFileSchema(filename: string, chunks: any[]): DetectedSchema {
  // Clean filename to get proper entity type
  let entityType = filename.replace(/\.(csv|json|excel?|xlsx?)$/i, ''); // Remove file extension
  entityType = entityType.replace(/rows?$/i, ''); // Remove 'rows' or 'row' suffix
  entityType = entityType.replace(/data$/i, ''); // Remove 'data' suffix
  entityType = entityType.replace(/[_-]/g, ''); // Remove underscores and hyphens
  entityType = entityType.toLowerCase(); // Normalize to lowercase
  
  // ALWAYS make entity type singular for consistency
  if (entityType.endsWith('s') && entityType.length > 3) {
    // Remove trailing 's' to make singular (but keep short words like 'us', 'is', etc.)
    entityType = entityType.slice(0, -1);
  }
  
  // Ensure entity type is not empty
  if (!entityType || entityType.length === 0) {
    entityType = 'item';
  }
  
  // Parse first chunk to understand structure
  const firstChunk = chunks[0];
  if (!firstChunk || !firstChunk.chunk_text) {
    return {
      entityType,
      primaryField: 'id',
      nameField: 'id',
      allFields: ['id'],
      sampleData: [],
      filename
    };
  }
  
  // Parse chunk text to extract fields
  const fieldMatches = firstChunk.chunk_text.match(/(\w+):\s*[^,]+/g) || [];
  const allFields = fieldMatches.map((match: string) => {
    const fieldName = match.split(':')[0].trim();
    return fieldName;
  });
  
  // Determine primary field (prefer id-like fields)
  const primaryField = allFields.find((field: string) => 
    field.toLowerCase().includes('id') || 
    field.toLowerCase().includes('key') ||
    field.toLowerCase() === 'id'
  ) || allFields[0] || 'id';
  
  // Infer field types (simplified)
  const fieldTypes: Record<string, string> = {};
  allFields.forEach((field: string) => {
    if (field.toLowerCase().includes('id')) {
      fieldTypes[field] = 'string';
    } else if (field.toLowerCase().includes('date') || field.toLowerCase().includes('time')) {
      fieldTypes[field] = 'date';
    } else if (field.toLowerCase().includes('price') || field.toLowerCase().includes('amount') || field.toLowerCase().includes('quantity')) {
      fieldTypes[field] = 'number';
    } else {
      fieldTypes[field] = 'string';
    }
  });
  
  return {
    entityType,
    primaryField,
    nameField: allFields.find((field: string) => 
      field.toLowerCase().includes('name') || 
      field.toLowerCase().includes('title')
    ) || primaryField,
    allFields,
    sampleData: chunks.slice(0, 3).map(chunk => parseChunkToObject(chunk.chunk_text)),
    filename
  };
}

// 🎯 BULLETPROOF: Works with ANY filename
function detectEntityTypeDynamically(filename: string, fields: string[], sampleData: any[]): string {
  // Method 1: Extract from filename (most reliable)
  if (filename && filename !== 'data' && filename !== 'unknown') {
    const entityFromFilename = extractEntityFromFilename(filename);
    if (entityFromFilename) return entityFromFilename;
  }
  
  // Method 2: Extract from ID field (works with ANY _id pattern)
  const idField = fields.find(f => f.toLowerCase().endsWith('_id'));
  if (idField) {
    return extractEntityFromIdField(idField);
  }
  
  // Method 3: Use primary object type from data
  const primaryField = detectPrimaryFieldDynamically(fields, sampleData);
  if (primaryField) {
    return extractEntityFromIdField(primaryField);
  }
  
  // Method 4: Infer from filename structure
  return extractEntityFromFilename(filename) || 'item';
}

function extractEntityFromFilename(filename: string): string {
  // Remove extension and common suffixes/prefixes
  let baseName = filename
    .replace(/\.(csv|xlsx?|json)$/i, '')  // Remove extensions
    .replace(/_(rows|data|list|table|records)$/i, '')  // Remove suffixes
    .replace(/^(data_|tbl_|list_)/i, '');  // Remove prefixes
  
  // Convert to singular - works with ANY plural
  return toSingularForm(baseName);
}

function extractEntityFromIdField(idField: string): string {
  // Handle any ID field pattern
  return idField
    .replace(/_id$/i, '')  // Remove _id suffix
    .replace(/^.*_/, '')   // Get last part if compound
    .toLowerCase();
}

// 🎯 BULLETPROOF: Detects primary field in ANY data
function detectPrimaryFieldDynamically(fields: string[], sampleData: any[]): string {
  // Priority 1: Any field ending with _id that has unique values
  const idFields = fields.filter(f => f.toLowerCase().endsWith('_id'));
  for (const field of idFields) {
    if (isUniqueField(field, sampleData)) return field;
  }
  
  // Priority 2: Any field with "id" that has unique values
  const allIdFields = fields.filter(f => f.toLowerCase().includes('id'));
  for (const field of allIdFields) {
    if (isUniqueField(field, sampleData)) return field;
  }
  
  // Priority 3: First field that has unique values
  for (const field of fields) {
    if (isUniqueField(field, sampleData)) return field;
  }
  
  return fields[0]; // Fallback to first field
}

// 🎯 BULLETPROOF: Finds name field in ANY data
function detectNameFieldDynamically(fields: string[], sampleData: any[]): string {
  // Priority 1: Fields with "name" in the name
  const nameFields = fields.filter(f => /name|title|label|description/i.test(f));
  if (nameFields.length > 0) return nameFields[0];
  
  // Priority 2: String fields that aren't IDs
  const stringFields = fields.filter(field => {
    const values = sampleData.map(obj => obj[field]).filter(Boolean);
    return values.length > 0 && 
           values.every(val => typeof val === 'string') && 
           !field.toLowerCase().includes('id');
  });
  
  return stringFields[0] || fields[1] || fields[0];
}

// Helper functions
function parseChunkToObject(chunkText: string): Record<string, any> {
  const obj: Record<string, any> = {};
  const pairs = chunkText.split(', ');
  
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(': ');
    if (colonIndex > 0) {
      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 2).trim();
      obj[key] = value;
    }
  }
  
  return obj;
}

function isUniqueField(field: string, sampleData: any[]): boolean {
  const values = sampleData.map(obj => obj[field]).filter(Boolean);
  return values.length > 0 && values.length === new Set(values).size;
}

function toSingularForm(word: string): string {
  // Simple but effective pluralization rules
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function extractFilenameFromContent(chunk: any): string {
  // Try to extract filename from chunk metadata or content
  if (chunk.metadata?.file_name) {
    return chunk.metadata.file_name;
  }
  
  // Try to extract from chunk text if it contains filename info
  if (chunk.chunk_text) {
    const filenameMatch = chunk.chunk_text.match(/filename:\s*([^,\s]+)/i);
    if (filenameMatch) {
      return filenameMatch[1];
    }
  }
  
  return 'data';
}
