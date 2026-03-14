// Web Worker for parsing CSV/Excel files
// Keeps UI responsive during file processing

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nulls: number;
  unique?: number;
  min?: number;
  max?: number;
  mean?: number;
  sample?: any[];
}

interface ParseResult {
  columns: ColumnInfo[];
  rows: any[];
  stats: {
    rowCountEstimate?: number;
    size: number;
    warnings?: string[];
  };
}

interface ParseMessage {
  type: 'parse';
  fileId: string;
  fileContent: string | ArrayBuffer;
  fileName: string;
  fileType: string;
}

// Type inference utilities
function inferType(values: any[]): { type: ColumnInfo['type']; sample: any[] } {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const sample = nonNullValues.slice(0, 10);
  
  if (nonNullValues.length === 0) {
    return { type: 'string', sample: [] };
  }

  // Check for numbers
  const numberPattern = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  const numberCount = nonNullValues.filter(v => numberPattern.test(String(v).trim())).length;
  const numberRatio = numberCount / nonNullValues.length;

  // Check for booleans
  const booleanPattern = /^(true|false|yes|no|1|0)$/i;
  const booleanCount = nonNullValues.filter(v => booleanPattern.test(String(v).trim())).length;
  const booleanRatio = booleanCount / nonNullValues.length;

  // Check for dates
  const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/;
  const dateCount = nonNullValues.filter(v => {
    const str = String(v).trim();
    return datePattern.test(str) && !isNaN(Date.parse(str));
  }).length;
  const dateRatio = dateCount / nonNullValues.length;

  // Determine type based on ratios
  if (numberRatio >= 0.8) {
    return { type: 'number', sample };
  } else if (booleanRatio >= 0.8) {
    return { type: 'boolean', sample };
  } else if (dateRatio >= 0.8) {
    return { type: 'date', sample };
  } else {
    return { type: 'string', sample };
  }
}

function calculateColumnStats(column: ColumnInfo, values: any[]): ColumnInfo {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  // Count nulls
  column.nulls = values.length - nonNullValues.length;
  
  // Count unique values (approximate)
  const uniqueSet = new Set(nonNullValues.map(v => String(v)));
  column.unique = uniqueSet.size;
  
  if (column.type === 'number') {
    const numbers = nonNullValues.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
    if (numbers.length > 0) {
      column.min = Math.min(...numbers);
      column.max = Math.max(...numbers);
      column.mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }
  }
  
  return column;
}

function parseCSV(content: string): ParseResult {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { columns: [], rows: [], stats: { size: content.length } };
  }

  // Simple CSV parsing (handle basic cases)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1, 101).map(line => parseCSVLine(line)); // First 100 rows
  
  // Ensure all rows have the same number of columns
  const maxCols = Math.max(headers.length, ...rows.map(row => row.length));
  const paddedHeaders = [...headers, ...Array(maxCols - headers.length).fill('')];
  const paddedRows = rows.map(row => [...row, ...Array(maxCols - row.length).fill('')]);

  // Infer column types
  const columns: ColumnInfo[] = paddedHeaders.map((header, index) => {
    const columnValues = paddedRows.map(row => row[index]);
    const { type, sample } = inferType(columnValues);
    
    const column: ColumnInfo = {
      name: header || `Column ${index + 1}`,
      type,
      nulls: 0,
      sample
    };
    
    return calculateColumnStats(column, columnValues);
  });

  return {
    columns,
    rows: paddedRows,
    stats: {
      rowCountEstimate: lines.length - 1,
      size: content.length,
      warnings: paddedRows.length < lines.length - 1 ? [`Showing first ${paddedRows.length} rows of ${lines.length - 1} total`] : undefined
    }
  };
}

function parseExcel(content: ArrayBuffer): ParseResult {
  // For now, return a placeholder - would need a library like xlsx
  // This is a simplified implementation
  return {
    columns: [],
    rows: [],
    stats: {
      size: content.byteLength,
      warnings: ['Excel parsing not yet implemented - please convert to CSV']
    }
  };
}

// Worker message handler
self.onmessage = function(e: MessageEvent<ParseMessage>) {
  const { type, fileId, fileContent, fileName, fileType } = e.data;
  
  if (type !== 'parse') {
    return;
  }

  try {
    let result: ParseResult;
    
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      result = parseCSV(fileContent as string);
    } else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      result = parseExcel(fileContent as ArrayBuffer);
    } else {
      result = {
        columns: [],
        rows: [],
        stats: {
          size: typeof fileContent === 'string' ? fileContent.length : (fileContent as ArrayBuffer).byteLength,
          warnings: ['Unsupported file type for preview']
        }
      };
    }

    self.postMessage({
      type: 'parseComplete',
      fileId,
      result
    });
  } catch (error) {
    self.postMessage({
      type: 'parseError',
      fileId,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    });
  }
};

export {};

