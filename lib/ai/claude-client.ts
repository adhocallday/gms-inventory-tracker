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
      console.error('Failed to parse JSON:', jsonMatch[0].substring(0, 500));
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON in response: ' + (parseError as Error).message);
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
