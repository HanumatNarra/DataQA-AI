/**
 * Universal Hybrid Processor
 *
 * This file has been refactored into smaller, focused modules for better maintainability:
 * - query/queryClassifier.ts: Query classification and LLM analysis
 * - query/tableAnalyzer.ts: Table analysis, breakdowns, and cross-reference logic
 * - query/responseFormatter.ts: Response generation and formatting
 * - query/queryProcessor.ts: Main orchestrator
 *
 * This file now serves as a compatibility layer, re-exporting the main functionality.
 */

export { processUniversalQuery } from './query/queryProcessor'
export type { UniversalResponse } from './query/queryProcessor'
