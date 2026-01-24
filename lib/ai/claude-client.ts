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
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: instructions
          }
        ]
      }]
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    
    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response: ' + textContent.text);
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}
