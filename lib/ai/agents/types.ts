/**
 * Document Agent Types
 *
 * Agents are specialized parsers with cached system prompts
 * that "know" the structure of specific document types.
 */

export interface DocumentAgent {
  /** Agent identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /**
   * System prompt with document structure knowledge.
   * This is cached using cache_control for faster subsequent requests.
   */
  systemPrompt: string;

  /**
   * JSON schema for output validation (optional).
   */
  outputSchema?: object;
}

export type DocumentType = 'sales-report' | 'po' | 'packing-list' | 'settlement';
