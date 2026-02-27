/**
 * Anthropic Client Wrapper
 *
 * Provides a configured Anthropic client instance for all agents.
 *
 * @module client
 * @version 1.0.0
 */

import Anthropic from '@anthropic-ai/sdk';

let clientInstance: Anthropic | null = null;

/**
 * Get or create the Anthropic client instance
 *
 * @param apiKey - Optional API key. If not provided, uses ANTHROPIC_API_KEY env var
 * @returns Configured Anthropic client
 */
export function getClient(apiKey?: string): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetClient(): void {
  clientInstance = null;
}

export { Anthropic };
