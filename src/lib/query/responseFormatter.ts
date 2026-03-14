import { DetectedSchema } from '../universalSchemaDetector'
import { QueryAnalysis } from '../universalQueryClassifier'
import { UniversalResponseGenerator } from '../universalResponseGenerator'
import { UniversalResponse } from './queryProcessor'
import { toPlural } from './tableAnalyzer'
import { OpenAI } from 'openai'

// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

/**
 * Generates an intelligent response using LLM or fallback to rule-based
 */
export async function generateIntelligentResponse(
  query: string,
  analysis: QueryAnalysis,
  processedData: any,
  schema: DetectedSchema
): Promise<UniversalResponse> {

  // Handle acknowledge operations (user said "no" to a system follow-up)
  if (analysis.operation === 'acknowledge') {
    return {
      message: "Understood! Let me know if you need anything else.",
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: false
    };
  }

  const dataSummary = {
    totalCount: processedData.count,
    sampleData: processedData.entities.slice(0, 3),
    allData: processedData.entities,
    filters: processedData.filters,
    schema: {
      entityType: schema.entityType,
      fields: schema.allFields
    }
  };

  const prompt = `Generate a natural, helpful response for this data query:

User Query: "${query}"
Query Analysis: ${JSON.stringify(analysis)}
Data Summary: ${JSON.stringify(dataSummary)}

CRITICAL RULES:
1. You MUST use the exact count from processedData.count (${processedData.count}) in your response.
2. DO NOT make up or estimate numbers. Use ONLY the provided data.
3. For LIST queries: If the user asks to "list them" or "show all", you MUST list ALL ${processedData.count} items, not just some.
4. For LIST queries: Use the format "Here are all ${processedData.count} [entityType]: [list all names]"
5. For COUNT queries: Use the format "There are ${processedData.count} [entityType] [with filters if any]"
6. If the count is 0, explain that no data was found
7. If filters were applied, mention them in the response

Please provide a natural, conversational response that:
1. Answers the user's question directly using the EXACT count: ${processedData.count}
2. For list queries, includes ALL items from the data
3. Uses proper grammar and natural language
4. Provides context when appropriate

Respond with ONLY the response text, no JSON or formatting.`;

  if (!openai) {
    const responseGenerator = new UniversalResponseGenerator();
    return responseGenerator.generateResponse(analysis, processedData, schema);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful data analysis assistant. Provide clear, natural responses using ONLY the provided data counts. For list queries, ALWAYS list ALL items, not just some."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from LLM");
    }

    // Validate that the response contains the correct count
    const responseLower = response.toLowerCase();
    const expectedCount = processedData.count;

    // Check if the response mentions the correct count
    const countMentioned = responseLower.includes(expectedCount.toString()) ||
                          responseLower.includes(`${expectedCount} ${schema.entityType}`) ||
                          responseLower.includes(`${expectedCount} ${schema.entityType}s`);

    // For list queries, check if it mentions "all" or lists the full count
    const isListQuery = analysis.isListQuery || query.toLowerCase().includes('list') || query.toLowerCase().includes('show');
    const listsAll = isListQuery ?
      (responseLower.includes('all') || responseLower.includes(`${expectedCount}`)) : true;

    if (!countMentioned || !listsAll) {
      // Fallback to rule-based response
      const responseGenerator = new UniversalResponseGenerator();
      return responseGenerator.generateResponse(analysis, processedData, schema);
    }

    return {
      message: response.trim(),
      count: processedData.count,
      isCountQuery: analysis.isCountQuery,
      isListQuery: analysis.isListQuery,
      isAnalyticalQuery: analysis.isAnalytical
    };
  } catch (error) {
    console.error(`[UNIVERSAL] LLM response generation failed:`, error);
    // Fallback to rule-based response
    const responseGenerator = new UniversalResponseGenerator();
    return responseGenerator.generateResponse(analysis, processedData, schema);
  }
}

/**
 * Generates a single-table breakdown response
 */
export async function generateSingleTableBreakdownResponse(
  query: string,
  analysis: any,
  dataBySchema: Record<string, any[]>,
  schemas: Map<string, DetectedSchema>
): Promise<UniversalResponse> {
  try {
    // Find the correct schema for the primary entity
    const targetSchema = Array.from(schemas.entries()).find(([, schema]) =>
      schema.entityType.toLowerCase() === analysis.primaryEntity.toLowerCase()
    );

    if (!targetSchema) {
      return {
        message: `Unable to find data for ${analysis.primaryEntity}. Available data types: ${Array.from(schemas.keys()).join(', ')}.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }

    const [filename, schema] = targetSchema;
    const data = dataBySchema[filename] || [];

    // Group data by the specified field - try multiple approaches to find the correct field
    let groupByField = analysis.joinFields?.primaryTable || analysis.groupByEntity;

    // If the field doesn't exist in the schema, try to find a similar field
    if (!schema.allFields.includes(groupByField)) {
      const queryFields = [analysis.groupByEntity, analysis.joinFields?.primaryTable].filter(Boolean).map((f: string) => f.toLowerCase());

      // Try to find a matching field
      for (const queryField of queryFields) {
        const matchingField = schema.allFields.find((field: string) =>
          field.toLowerCase() === queryField ||
          field.toLowerCase().includes(queryField) ||
          queryField.includes(field.toLowerCase())
        );
        if (matchingField) {
          groupByField = matchingField;
          break;
        }
      }
    }

    const groupedData = new Map();

    for (const item of data) {
      const groupValue = item[groupByField] || 'Unknown';
      if (!groupedData.has(groupValue)) {
        groupedData.set(groupValue, []);
      }
      groupedData.get(groupValue).push(item);
    }

    // Generate breakdown response
    const breakdown = Array.from(groupedData.entries()).map(([groupName, items]) => ({
      group: groupName,
      count: (items as any[]).length,
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
    console.error(`[UNIVERSAL] Error generating single-table breakdown response:`, error);
    return {
      message: `Sorry, I encountered an error while generating the single-table breakdown response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: true
    };
  }
}

/**
 * Generates a cross-table response (multi-table joins)
 */
export async function generateCrossTableResponse(
  query: string,
  analysis: any,
  dataBySchema: Record<string, any[]>,
  schemas: Map<string, DetectedSchema>
): Promise<UniversalResponse> {
  try {
    // Find the primary and group-by schemas
    const primarySchema = Array.from(schemas.entries()).find(([, schema]) =>
      schema.entityType.toLowerCase() === analysis.primaryEntity.toLowerCase()
    );

    const groupBySchema = Array.from(schemas.entries()).find(([, schema]) =>
      schema.entityType.toLowerCase() === analysis.groupByEntity.toLowerCase()
    );

    if (!primarySchema || !groupBySchema) {
      return {
        message: `Unable to find the required data tables for ${analysis.primaryEntity} and ${analysis.groupByEntity}.`,
        count: 0,
        isCountQuery: false,
        isListQuery: false,
        isAnalyticalQuery: true
      };
    }

    const [primaryFile] = primarySchema;
    const [groupByFile] = groupBySchema;

    const primaryData = dataBySchema[primaryFile] || [];
    const groupByData = dataBySchema[groupByFile] || [];

    // Create lookup maps for joining
    const groupByLookup = new Map();
    for (const item of groupByData) {
      const key = item[analysis.joinFields?.groupByTable || 'department_id'] || item.department_id || item.id;
      const name = item.name || item.department_name || item.category_name || key;
      groupByLookup.set(key, name);
    }

    // Group primary data by the join field
    const groupedData = new Map();
    for (const item of primaryData) {
      const key = item[analysis.joinFields?.primaryTable || 'department_id'] || item.department_id || item.id;
      const groupName = groupByLookup.get(key) || key;

      if (!groupedData.has(groupName)) {
        groupedData.set(groupName, []);
      }
      groupedData.get(groupName).push(item);
    }

    // Generate breakdown response
    const breakdown = Array.from(groupedData.entries()).map(([groupName, items]) => ({
      group: groupName,
      count: (items as any[]).length,
      items: items
    }));

    const totalCount = primaryData.length;

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
    console.error(`[UNIVERSAL] Error generating cross-table response:`, error);
    return {
      message: `Sorry, I encountered an error while generating the cross-table response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      count: 0,
      isCountQuery: false,
      isListQuery: false,
      isAnalyticalQuery: true
    };
  }
}
