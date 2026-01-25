import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export interface ParsedDocument {
  [key: string]: any;
}

export async function parseDocument(
  base64Data: string,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png',
  instructions: string
): Promise<ParsedDocument> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            ({
              // The SDK types lag behind the API; "document" is valid at runtime.
              type: 'document',
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
