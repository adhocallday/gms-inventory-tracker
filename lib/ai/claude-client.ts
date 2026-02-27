import Anthropic from '@anthropic-ai/sdk';
import type { DocumentAgent } from './agents/types';

// Lazily initialized client (allows dotenv to load first in scripts)
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31'
      }
    });
  }
  return _client;
}

// Model selection
const HAIKU_MODEL = 'claude-3-5-haiku-20241022';  // Fast, good for structured extraction
const SONNET_MODEL = 'claude-sonnet-4-20250514'; // Powerful, for complex/fallback
const DEFAULT_MODEL = HAIKU_MODEL; // Use Haiku by default for 10x speed improvement

export interface ParsedDocument {
  [key: string]: any;
}

export interface AgentParseResult {
  data: ParsedDocument;
  cacheHit: boolean;
  parseTimeMs: number;
}

/**
 * Parse extracted text using Claude (much faster than document parsing).
 * Use this when you've already extracted text from a PDF.
 * Uses Haiku with tool_choice for fast, reliable JSON output.
 * @param text - The extracted text content
 * @param instructions - Extraction instructions for Claude
 * @param outputSchema - Optional JSON schema to enforce structured output (uses tool_choice)
 */
export async function parseText(
  text: string,
  instructions: string,
  outputSchema?: object
): Promise<ParsedDocument> {
  // Use Haiku with tool_choice for ~10x speed improvement
  const modelId = DEFAULT_MODEL;

  try {
    // If schema provided, use tool_choice for guaranteed valid JSON
    if (outputSchema) {
      const response = await getClient().messages.create({
        model: modelId,
        max_tokens: 8192,
        tools: [{
          name: 'extract_data',
          description: 'Extract structured data from the document',
          input_schema: outputSchema as Anthropic.Tool['input_schema']
        }],
        tool_choice: { type: 'tool', name: 'extract_data' },
        messages: [
          {
            role: 'user',
            content: `${instructions}\n\n---\nDocument text:\n${text}`
          }
        ]
      });

      // Extract tool use result
      const toolUse = response.content.find(c => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use response from Claude');
      }
      return toolUse.input as ParsedDocument;
    }

    // Fallback: no schema, parse JSON from text response
    const response = await getClient().messages.create({
      model: modelId,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `${instructions}\n\n---\nDocument text:\n${text}`
        }
      ]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let responseText = textContent.text;

    // Remove markdown code blocks if present
    if (responseText.includes('```')) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        responseText = codeBlockMatch[1];
      }
    }

    // Extract JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', responseText.substring(0, 500));
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude API Error (text parsing):', error);
    throw error;
  }
}

/**
 * Parse a document using Claude (slower, use for images or when text extraction fails).
 * @param base64Data - Base64 encoded document data
 * @param mediaType - MIME type of the document
 * @param instructions - Extraction instructions for Claude
 * @param outputSchema - Optional JSON schema to enforce structured output (uses tool_choice)
 */
export async function parseDocument(
  base64Data: string,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png',
  instructions: string,
  outputSchema?: object
): Promise<ParsedDocument> {
  // Use Haiku with schema for speed, Sonnet without for complex docs
  const modelId = outputSchema ? DEFAULT_MODEL : SONNET_MODEL;

  try {
    // Use 'document' for PDFs, 'image' for images
    const contentType = mediaType === 'application/pdf' ? 'document' : 'image';

    // If schema provided, use tool_choice for guaranteed valid JSON
    if (outputSchema) {
      const response = await getClient().messages.create({
        model: modelId,
        max_tokens: 16384,
        tools: [{
          name: 'extract_data',
          description: 'Extract structured data from the document',
          input_schema: outputSchema as Anthropic.Tool['input_schema']
        }],
        tool_choice: { type: 'tool', name: 'extract_data' },
        messages: [
          {
            role: 'user',
            content: [
              ({
                type: contentType,
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data
                }
              } as any),
              {
                type: 'text',
                text: instructions
              }
            ]
          }
        ]
      } as any);

      // Extract tool use result
      const toolUse = response.content.find(c => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use response from Claude');
      }
      return toolUse.input as ParsedDocument;
    }

    // Fallback: no schema, parse JSON from text response (uses Sonnet)
    const response = await getClient().messages.create({
      model: modelId,
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            ({
              // The SDK types lag behind the API; "document" and "image" are valid at runtime.
              type: contentType,
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            } as any),
            {
              type: 'text',
              text: instructions
            }
          ]
        }
      ]
    } as any);

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let responseText = textContent.text;

    // Remove markdown code blocks if present
    if (responseText.includes('```')) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        responseText = codeBlockMatch[1];
      }
    }

    // Extract JSON object (greedy match from first { to last })
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', responseText.substring(0, 500));
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      const errorMsg = (parseError as Error).message;
      console.error('Failed to parse JSON. Parse error:', errorMsg);
      console.error('JSON length:', jsonMatch[0].length);
      console.error('First 500 chars:', jsonMatch[0].substring(0, 500));
      console.error('Last 500 chars:', jsonMatch[0].substring(jsonMatch[0].length - 500));

      // Try to extract position from error message
      const posMatch = errorMsg.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const start = Math.max(0, pos - 200);
        const end = Math.min(jsonMatch[0].length, pos + 200);
        console.error(`Context around position ${pos}:`);
        console.error(jsonMatch[0].substring(start, end));
      }

      // Write to temp file for debugging
      try {
        const fs = require('fs');
        const tempFile = '/tmp/claude-json-error.json';
        fs.writeFileSync(tempFile, jsonMatch[0]);
        console.error(`Full response written to: ${tempFile}`);
      } catch (fsError) {
        console.error('Failed to write debug file:', fsError);
      }

      throw new Error('Invalid JSON in response: ' + errorMsg);
    }
  } catch (error) {
    console.error('Claude API Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Parse text using a specialized document agent with cached system prompt.
 *
 * Uses Haiku for fast text extraction (~5s vs ~50s with Sonnet).
 * Also uses cache_control for faster subsequent requests.
 *
 * @param agent - Document agent with specialized system prompt
 * @param documentText - Extracted text from PDF
 * @param useHaiku - Use Haiku (fast) or Sonnet (powerful). Default: true
 * @returns Parsed document with cache metadata
 */
export async function parseWithAgent(
  agent: DocumentAgent,
  documentText: string,
  useHaiku: boolean = true
): Promise<AgentParseResult> {
  const startTime = Date.now();
  const modelId = useHaiku ? HAIKU_MODEL : SONNET_MODEL;
  // Haiku supports max 4096 tokens, Sonnet supports 8192
  const maxTokens = useHaiku ? 4096 : 8192;

  try {
    // SDK types lag behind API - cache_control is valid at runtime
    const response = await getClient().messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system: [
        {
          type: 'text',
          text: agent.systemPrompt,
          cache_control: { type: 'ephemeral' }
        } as any
      ],
      messages: [
        {
          role: 'user',
          content: documentText
        }
      ]
    });

    const parseTimeMs = Date.now() - startTime;

    // Check if cache was hit (cache_creation_input_tokens = 0 means cache hit)
    const cacheCreationTokens = (response.usage as any)?.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = (response.usage as any)?.cache_read_input_tokens ?? 0;
    const cacheHit = cacheCreationTokens === 0 && cacheReadTokens > 0;

    console.log(`[${agent.name}] Model: ${modelId}`);
    console.log(`[${agent.name}] Parse time: ${parseTimeMs}ms`);
    console.log(`[${agent.name}] Cache: ${cacheHit ? 'HIT' : 'MISS'} (created: ${cacheCreationTokens}, read: ${cacheReadTokens})`);

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let responseText = textContent.text;

    // Remove markdown code blocks if present
    if (responseText.includes('```')) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        responseText = codeBlockMatch[1];
      }
    }

    // Extract JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from agent response:', responseText.substring(0, 500));
      throw new Error('No JSON found in response');
    }

    return {
      data: JSON.parse(jsonMatch[0]),
      cacheHit,
      parseTimeMs
    };
  } catch (error) {
    console.error(`[${agent.name}] Error:`, error);
    throw error;
  }
}
