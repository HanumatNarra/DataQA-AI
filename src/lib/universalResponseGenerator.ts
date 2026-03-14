import { QueryAnalysis } from './universalQueryClassifier'
import { DetectedSchema } from './universalSchemaDetector'
import { ProcessedDataResult } from './universalDataProcessor'

export interface UniversalResponse {
  message: string
  count?: number
  items?: string[]
  breakdown?: any
  isCountQuery: boolean
  isListQuery: boolean
  isAnalyticalQuery: boolean
}

export class UniversalResponseGenerator {
  generateResponse(queryAnalysis: QueryAnalysis, processedData: ProcessedDataResult, schema: DetectedSchema): UniversalResponse {
    if (queryAnalysis.isCountQuery) {
      return this.generateCountResponse(processedData, schema, queryAnalysis);
    } else if (queryAnalysis.isListQuery) {
      return this.generateListResponse(processedData, schema, queryAnalysis);
    } else if (queryAnalysis.isAnalytical) {
      return this.generateAnalyzeResponse(processedData, schema, queryAnalysis);
    } else {
      return this.generateDefaultResponse(processedData, schema, queryAnalysis);
    }
  }

  private generateCountResponse(processedData: ProcessedDataResult, schema: DetectedSchema, queryAnalysis: QueryAnalysis): UniversalResponse {
    const count = processedData.count;
    const entityType = schema.entityType;
    
    // Use proper singular/plural grammar
    const entityLabel = count === 1 ? entityType : this.toPlural(entityType);
    
    let message = `There are ${count} ${entityLabel} in the dataset.`;
    
    // Add filter context if filters were applied
    if (processedData.filters && Object.keys(processedData.filters).length > 0) {
      const filterDescriptions = Object.entries(processedData.filters).map(([field, value]) => {
        if (typeof value === 'object' && value.type === 'date_range') {
          // Date range filter
          const startDate = new Date(value.start);
          const endDate = new Date(value.end);
          const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const endMonth = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          
          if (startMonth === endMonth) {
            return `from ${startMonth}`;
          } else {
            return `between ${startMonth} and ${endMonth}`;
          }
        } else if (typeof value === 'object' && value.operator) {
          // Comparison operator filter
          const operatorText: Record<string, string> = {
            '>': 'greater than',
            '<': 'less than',
            '>=': 'greater than or equal to',
            '<=': 'less than or equal to',
            '=': 'equal to',
            '==': 'equal to'
          };
          
          const operator = String(value.operator);
          const operatorDescription = operatorText[operator] || operator;
          
          return `with ${field} ${operatorDescription} ${value.value}`;
        } else {
          // Simple filter
          return `with ${field} "${value}"`;
        }
      });
      
      const filterText = filterDescriptions.join(' and ');
      message = `There are ${count} ${entityLabel} ${filterText} in the dataset.`;
    }
    
    return {
      message,
      count,
      isCountQuery: true,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }

  private generateListResponse(processedData: ProcessedDataResult, schema: DetectedSchema, queryAnalysis: QueryAnalysis): UniversalResponse {
    const entities = processedData.entities;
    const entityType = schema.entityType;
    const plural = this.toPlural(entityType);
    
    if (entities.length === 0) {
      return {
        message: `No ${plural} found.`,
        count: 0,
        isCountQuery: false,
        isListQuery: true,
        isAnalyticalQuery: false
      };
    }
    
    // Try to extract names from entities
    const names = entities.slice(0, 10).map(entity => {
      // Look for name-like fields
            const nameField = entity.name || entity[schema.nameField] || 
                       entity[schema.primaryField] || 'Unknown';
      return nameField;
    });
    
    const message = `Your ${plural}: ${names.join(', ')}${entities.length > 10 ? ` and ${entities.length - 10} more` : ''}.`;
    
    return {
      message,
      count: entities.length,
      items: names,
      isCountQuery: false,
      isListQuery: true,
      isAnalyticalQuery: false
    };
  }

  private generateAnalyzeResponse(processedData: ProcessedDataResult, schema: DetectedSchema, queryAnalysis: QueryAnalysis): UniversalResponse {
    const entities = processedData.entities;
    const entityType = schema.entityType;
    
    if (entities.length === 0) {
      return {
        message: `No ${entityType} data available for analysis.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }
    
    // Simple analysis based on available fields
    const message = `Analysis of ${entities.length} ${this.toPlural(entityType)}: Found ${entities.length} records.`;
    
    return {
      message,
      count: entities.length,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: true
    };
  }

  private generateDefaultResponse(processedData: ProcessedDataResult, schema: DetectedSchema, queryAnalysis: QueryAnalysis): UniversalResponse {
    const count = processedData.count;
    const entityType = schema.entityType;
    const plural = this.toPlural(entityType);
    
    return {
      message: `Found ${count} ${plural}.`,
      count,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }

  private toPlural(word: string): string {
    // Simple pluralization rules
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x')) {
      return word + 'es';
    } else {
      return word + 's';
    }
  }
}
