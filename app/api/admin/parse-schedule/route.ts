import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/ai/claude-client';

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

/**
 * POST /api/admin/parse-schedule
 * Parse tour schedule from PDF, CSV, or Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tourName = formData.get('tourName') as string;
    const artist = formData.get('artist') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    // Determine media type
    let mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' = 'application/pdf';
    if (file.type.includes('image/jpeg') || file.type.includes('image/jpg')) {
      mediaType = 'image/jpeg';
    } else if (file.type.includes('image/png')) {
      mediaType = 'image/png';
    }

    console.log(`[Parse Schedule] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) for ${tourName} by ${artist}`);

    // Create instructions for Claude
    const instructions = `You are analyzing a document containing tour schedule information for "${tourName}" by ${artist}.

Extract all show/concert dates from this document and return them as a structured JSON array.

For each show, extract:
- showDate: Date in YYYY-MM-DD format
- venueName: Name of the venue/location
- city: City name
- state: State/province abbreviation (e.g., "FL", "CA", "ON")
- country: Country code (e.g., "US", "CA", "UK")
- capacity: Venue capacity (if mentioned, otherwise null)

IMPORTANT FORMATTING:
- showDate MUST be in YYYY-MM-DD format (e.g., "2025-01-15")
- If only month/day is given, infer the year from context or tour name
- State should be 2-letter abbreviation (FL, not Florida)
- Country should be 2-letter code (US, not United States)

Return ONLY a valid JSON object (no markdown formatting):
{
  "shows": [
    {
      "showDate": "2025-01-15",
      "venueName": "Amalie Arena",
      "city": "Tampa",
      "state": "FL",
      "country": "US",
      "capacity": 19092
    }
  ]
}

If no shows are found, return: {"shows": []}`;

    const parsedResponse = await parseDocument(base64Data, mediaType, instructions);

    console.log(`[Parse Schedule] Successfully extracted ${parsedResponse.shows?.length || 0} shows`);

    // Validate the response
    if (!parsedResponse.shows || !Array.isArray(parsedResponse.shows)) {
      console.error('[Parse Schedule] Invalid response format:', parsedResponse);
      return NextResponse.json(
        { error: 'Failed to extract show data from document' },
        { status: 500 }
      );
    }

    // Validate each show has required fields
    const validShows = parsedResponse.shows.filter((show: any) =>
      show.showDate && show.venueName && show.city && show.state && show.country
    );

    if (validShows.length < parsedResponse.shows.length) {
      console.warn(`[Parse Schedule] Filtered out ${parsedResponse.shows.length - validShows.length} invalid shows`);
    }

    return NextResponse.json({
      shows: validShows,
      totalExtracted: parsedResponse.shows.length,
      validShows: validShows.length
    });
  } catch (error: any) {
    console.error('[Parse Schedule] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse schedule' },
      { status: 500 }
    );
  }
}
