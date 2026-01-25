import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

/**
 * POST /api/admin/parse-schedule-text
 * Parse tour schedule from plain text input (chat-style)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, tourName, artist } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    console.log(`[Parse Schedule Text] Processing text for ${tourName} by ${artist}`);

    // Use Claude to parse the unstructured text
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are analyzing text containing tour schedule information for "${tourName}" by ${artist}.

Extract all show/concert dates from this unstructured text and return them as a structured JSON array.

For each show, extract:
- showDate: Date in YYYY-MM-DD format
- venueName: Name of the venue/location (if not provided, use "TBD")
- city: City name
- state: State/province abbreviation (e.g., "FL", "CA", "ON")
- country: Country code (e.g., "US", "CA", "UK")
- capacity: Venue capacity (if mentioned, otherwise null)

IMPORTANT FORMATTING:
- showDate MUST be in YYYY-MM-DD format (e.g., "2025-01-15")
- If only month/day is given, infer the year from context or use 2025
- State should be 2-letter abbreviation (FL, not Florida)
- Country should be 2-letter code (US, not United States)
- If country is not mentioned, assume "US"
- If venue name is not mentioned, use "TBD"

EXAMPLE INPUT:
"January 15 Tampa, FL at Amalie Arena
Jan 17 Atlanta, GA
1/19 Nashville TN - Bridgestone Arena"

EXAMPLE OUTPUT:
{
  "shows": [
    {
      "showDate": "2025-01-15",
      "venueName": "Amalie Arena",
      "city": "Tampa",
      "state": "FL",
      "country": "US"
    },
    {
      "showDate": "2025-01-17",
      "venueName": "TBD",
      "city": "Atlanta",
      "state": "GA",
      "country": "US"
    },
    {
      "showDate": "2025-01-19",
      "venueName": "Bridgestone Arena",
      "city": "Nashville",
      "state": "TN",
      "country": "US"
    }
  ]
}

USER TEXT:
${text}

Return ONLY valid JSON (no markdown formatting):
{"shows": [...]}

If no shows are found, return: {"shows": []}`
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let responseText = textContent.text;

    // Remove markdown code blocks if present
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) responseText = match[1];
    }

    // Extract JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

    console.log(`[Parse Schedule Text] Successfully extracted ${parsedResponse.shows?.length || 0} shows`);

    // Validate the response
    if (!parsedResponse.shows || !Array.isArray(parsedResponse.shows)) {
      console.error('[Parse Schedule Text] Invalid response format:', parsedResponse);
      return NextResponse.json(
        { error: 'Failed to extract show data from text' },
        { status: 500 }
      );
    }

    // Validate each show has required fields
    const validShows = parsedResponse.shows.filter((show: any) =>
      show.showDate && show.venueName && show.city && show.state && show.country
    );

    if (validShows.length < parsedResponse.shows.length) {
      console.warn(`[Parse Schedule Text] Filtered out ${parsedResponse.shows.length - validShows.length} invalid shows`);
    }

    return NextResponse.json({
      shows: validShows,
      totalExtracted: parsedResponse.shows.length,
      validShows: validShows.length
    });
  } catch (error: any) {
    console.error('[Parse Schedule Text] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse schedule text' },
      { status: 500 }
    );
  }
}
