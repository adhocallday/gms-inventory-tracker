import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/ai/claude-client';
import { createServiceClient } from '@/lib/supabase/client';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

interface TourShowMatch {
  tourId: string | null;
  tourName: string | null;
  showId: string | null;
  showDate: string | null;
  venueName: string | null;
  matchReasoning: string[];
}

const DOC_TYPE_DESCRIPTIONS = {
  'po': 'Purchase Order',
  'packing-list': 'Packing List',
  'sales-report': 'Sales Report',
  'settlement': 'Settlement'
};

/**
 * Match extracted tour/show information against the database
 */
async function matchTourAndShow(extractedInfo: any): Promise<TourShowMatch> {
  const result: TourShowMatch = {
    tourId: null,
    tourName: null,
    showId: null,
    showDate: null,
    venueName: null,
    matchReasoning: []
  };

  if (!extractedInfo) {
    result.matchReasoning.push('No extracted information available');
    return result;
  }

  const supabase = createServiceClient();

  // Try to match tour by artist/tour name
  if (extractedInfo.artistOrTourName) {
    const searchTerm = extractedInfo.artistOrTourName.toLowerCase();

    const { data: tours, error } = await supabase
      .from('tours')
      .select('id, name, artist')
      .or(`name.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`)
      .limit(5);

    if (tours && tours.length > 0) {
      // Prefer exact matches or closer matches
      const exactMatch = tours.find(t =>
        t.name.toLowerCase().includes(searchTerm) ||
        t.artist?.toLowerCase().includes(searchTerm)
      );

      const matchedTour = exactMatch || tours[0];
      result.tourId = matchedTour.id;
      result.tourName = matchedTour.name;
      result.matchReasoning.push(`Matched tour "${matchedTour.name}" by artist/tour name "${extractedInfo.artistOrTourName}"`);
    } else {
      result.matchReasoning.push(`No tour found matching "${extractedInfo.artistOrTourName}"`);
    }
  }

  // Try to match show by date and venue
  if (extractedInfo.showDate) {
    let query = supabase
      .from('shows')
      .select('id, tour_id, show_date, venue_name, city, state')
      .eq('show_date', extractedInfo.showDate);

    // If we already matched a tour, filter by that tour
    if (result.tourId) {
      query = query.eq('tour_id', result.tourId);
    }

    // If venue name is available, use it to filter
    if (extractedInfo.venueName) {
      query = query.ilike('venue_name', `%${extractedInfo.venueName}%`);
    }

    const { data: shows, error } = await query.limit(5);

    if (shows && shows.length > 0) {
      const matchedShow = shows[0];
      result.showId = matchedShow.id;
      result.showDate = matchedShow.show_date;
      result.venueName = matchedShow.venue_name;

      // Update tour if we didn't have it before
      if (!result.tourId && matchedShow.tour_id) {
        result.tourId = matchedShow.tour_id;

        const { data: tour } = await supabase
          .from('tours')
          .select('name')
          .eq('id', matchedShow.tour_id)
          .single();

        if (tour) {
          result.tourName = tour.name;
          result.matchReasoning.push(`Matched tour "${tour.name}" from matched show`);
        }
      }

      result.matchReasoning.push(
        `Matched show on ${matchedShow.show_date} at ${matchedShow.venue_name}`
      );
    } else {
      result.matchReasoning.push(`No show found for date ${extractedInfo.showDate}`);
    }
  }

  // If we have a tour but no show, and we have venue info, try to find the show
  if (result.tourId && !result.showId && extractedInfo.venueName) {
    const { data: shows } = await supabase
      .from('shows')
      .select('id, show_date, venue_name')
      .eq('tour_id', result.tourId)
      .ilike('venue_name', `%${extractedInfo.venueName}%`)
      .limit(1);

    if (shows && shows.length > 0) {
      result.showId = shows[0].id;
      result.showDate = shows[0].show_date;
      result.venueName = shows[0].venue_name;
      result.matchReasoning.push(`Matched show by venue name "${extractedInfo.venueName}"`);
    }
  }

  return result;
}

/**
 * POST /api/detect-doc-type
 * Detect document type using Claude's PDF reading capability
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');

    console.log(`[Detect Doc Type] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) with Claude`);

    // Use the same parseDocument function that all other parsers use
    const instructions = `You are analyzing a PDF document to determine its type and extract key information.

Possible document types:
1. Purchase Order (PO) - Contains vendor information, order details, SKUs, quantities, pricing
2. Packing List - Contains shipment details, received quantities, tracking information
3. Sales Report - Contains sales data, quantities sold, revenue by product
4. Settlement - Contains financial settlement information, fees, net amounts

Analyze this PDF and return ONLY a JSON object (no markdown formatting) with:
{
  "detectedType": "po" | "packing-list" | "sales-report" | "settlement",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation of why this type was chosen",
  "indicators": ["indicator 1", "indicator 2", "indicator 3"],
  "extractedInfo": {
    "artistOrTourName": "string or null (look for artist name, tour name, or band name)",
    "showDate": "YYYY-MM-DD or null (if this is a show-specific document)",
    "venueName": "string or null (venue or location name if present)",
    "city": "string or null",
    "state": "string or null"
  }
}

Important: Extract artistOrTourName, showDate, and venueName even if confidence is low. Look for:
- Artist/band names (e.g., "GHOST", "Ghost B.C.", etc.)
- Tour names (e.g., "Re-Imperatour", "2025 Tour")
- Venue names (e.g., "CFG Bank Arena", "Madison Square Garden")
- Show dates in any format`;

    const parsedResponse = await parseDocument(base64Pdf, 'application/pdf', instructions);

    const classification: ClassificationResult = {
      detectedType: parsedResponse.detectedType,
      typeName: DOC_TYPE_DESCRIPTIONS[parsedResponse.detectedType as DocType] || 'Unknown',
      confidence: parsedResponse.confidence || 'low',
      reasoning: parsedResponse.reasoning || 'No reasoning provided',
      indicators: parsedResponse.indicators || [],
    };

    console.log(`[Detect Doc Type] Result: ${classification.typeName} (${classification.confidence} confidence)`);

    // Try to match tour and show from extracted info
    const tourShowMatch = await matchTourAndShow(parsedResponse.extractedInfo);

    console.log(`[Detect Doc Type] Tour/Show Match: ${JSON.stringify(tourShowMatch)}`);

    return NextResponse.json({
      classification,
      tourShowMatch,
      preview: {
        pageCount: null,
      },
    });
  } catch (error: any) {
    console.error('[Detect doc type] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect document type' },
      { status: 500 }
    );
  }
}
