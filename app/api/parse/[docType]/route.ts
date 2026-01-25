import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';
import { parsePurchaseOrder } from '@/lib/ai/parsers/po-parser';
import { parsePackingList } from '@/lib/ai/parsers/packing-list-parser';
import { parseSalesReport } from '@/lib/ai/parsers/sales-report-parser';
import { parseSettlementReport } from '@/lib/ai/parsers/settlement-parser';

export const runtime = 'nodejs';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

function toNumber(value: any) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizePurchaseOrder(parsed: any, tourId?: string | null) {
  const lineItems = (parsed?.lineItems ?? []).map((item: any) => {
    const quantity = toNumber(item?.quantity);
    const unitCost = toNumber(item?.unitCost);
    return {
      sku: item?.sku ?? '',
      description: item?.description ?? '',
      size: item?.size ?? '',
      quantity_ordered: quantity,
      unit_cost: unitCost,
      line_total: toNumber(item?.total) || quantity * unitCost
    };
  });

  const totalAmount =
    toNumber(parsed?.totalAmount) ||
    lineItems.reduce((sum: number, item: any) => sum + toNumber(item.line_total), 0);

  return {
    tour_id: tourId ?? null,
    po_number: parsed?.poNumber ?? '',
    vendor: parsed?.vendor ?? '',
    order_date: parsed?.orderDate ?? '',
    expected_delivery_date: parsed?.expectedDelivery ?? '',
    currency: 'USD',
    status: 'open',
    line_items: lineItems,
    total_amount: totalAmount
  };
}

function normalizePackingList(parsed: any, tourId?: string | null) {
  const lineItems = (parsed?.lineItems ?? []).map((item: any) => ({
    sku: item?.sku ?? '',
    description: item?.description ?? '',
    size: item?.size ?? '',
    quantity_received: toNumber(item?.quantityReceived)
  }));

  return {
    tour_id: tourId ?? null,
    delivery_number: parsed?.deliveryNumber ?? '',
    po_number: parsed?.poNumber ?? '',
    received_date: parsed?.receivedDate ?? '',
    received_location: '',
    received_by: '',
    line_items: lineItems
  };
}

function normalizeSalesReport(
  parsed: any,
  tourId?: string | null,
  showId?: string | null
) {
  const lineItems = (parsed?.lineItems ?? []).map((item: any) => ({
    sku: item?.sku ?? '',
    description: item?.description ?? '',
    size: item?.size ?? '',
    qty_sold: toNumber(item?.sold),
    unit_price: toNumber(item?.unitPrice),
    gross_sales: toNumber(item?.gross)
  }));

  return {
    tour_id: tourId ?? null,
    show_id: showId ?? null,
    show_date: parsed?.showDate ?? '',
    venue_name: parsed?.venueName ?? '',
    city: parsed?.city ?? '',
    state: parsed?.state ?? '',
    attendance: parsed?.attendance ?? null,
    total_gross: toNumber(parsed?.totalGross),
    line_items: lineItems
  };
}

function normalizeSettlement(
  parsed: any,
  tourId?: string | null,
  showId?: string | null
) {
  const comps = (parsed?.comps ?? []).map((item: any) => ({
    comp_category: 'global',  // Default to global - user can change in UI
    comp_source: 'show',      // Default to show - user can change in UI
    comp_type: 'other',
    sku: item?.sku ?? '',
    description: item?.description ?? '',
    size: item?.size ?? '',
    quantity: toNumber(item?.quantity)
  }));

  return {
    tour_id: tourId ?? null,
    show_id: showId ?? null,
    show_date: parsed?.showDate ?? '',
    venue_name: parsed?.venueName ?? '',
    gross_sales_total: toNumber(parsed?.grossSales),
    sales_tax_total: toNumber(parsed?.salesTax),
    credit_card_fees: toNumber(parsed?.ccFees),
    other_fees: null,
    refunds: null,
    net_settlement_amount: null,
    comps
  };
}

async function inferTourAndShow(
  supabase: ReturnType<typeof createServiceClient>,
  normalized: any
) {
  const reasoning: string[] = [];
  let tourId = normalized?.tour_id ?? null;
  let showId = normalized?.show_id ?? null;

  if (!showId && normalized?.show_date) {
    const query = supabase
      .from('shows')
      .select('id, tour_id, venue_name')
      .eq('show_date', normalized.show_date)
      .limit(1);

    if (normalized?.venue_name) {
      query.ilike('venue_name', `%${normalized.venue_name}%`);
    }

    const { data: showMatch } = await query.maybeSingle();
    if (showMatch?.id) {
      showId = showMatch.id;
      tourId = tourId ?? showMatch.tour_id;
      reasoning.push('Matched show by date & venue.');
    } else {
      reasoning.push('Unable to match show automatically.');
    }
  }

  if (!tourId && showId) {
    const { data: show } = await supabase
      .from('shows')
      .select('tour_id')
      .eq('id', showId)
      .maybeSingle();
    if (show?.tour_id) {
      tourId = show.tour_id;
      reasoning.push('Derived tour from matched show.');
    }
  }

  if (!tourId && normalized?.venue_name) {
    const keyword = normalized.venue_name.split(' ')[0];
    if (keyword) {
      const { data: tourMatch } = await supabase
        .from('tours')
        .select('id, name')
        .ilike('name', `%${keyword}%`)
        .limit(1)
        .maybeSingle();
      if (tourMatch?.id) {
        tourId = tourMatch.id;
        reasoning.push('Matched tour via venue keyword.');
      }
    }
  }

  normalized.tour_id = tourId ?? normalized.tour_id ?? null;
  normalized.show_id = showId ?? normalized.show_id ?? null;

  return reasoning.filter(Boolean);
}

function extractBaseSku(sku: string): string {
  // Remove size suffixes like _SM, _MD, _LG, _XL, _2XL, _3XL, _2X, _3X
  return sku.replace(/_(SM|MD|LG|XL|2XL|3XL|2X|3X)$/i, '');
}

async function findMissingSkus(
  supabase: ReturnType<typeof createServiceClient>,
  skus: string[]
) {
  if (skus.length === 0) return [];
  const uniqueSkus = Array.from(new Set(skus.filter(Boolean)));
  if (uniqueSkus.length === 0) return [];

  // Extract base SKUs (without size suffixes) for product lookup
  const baseSkus = uniqueSkus.map(extractBaseSku);
  const uniqueBaseSkus = Array.from(new Set(baseSkus));

  const { data, error } = await supabase
    .from('products')
    .select('sku')
    .in('sku', uniqueBaseSkus);

  if (error) return uniqueSkus;

  const knownBaseSkus = new Set((data ?? []).map((row) => row.sku));

  // Return full SKUs (with size) whose base SKU is not found
  return uniqueSkus.filter((sku) => !knownBaseSkus.has(extractBaseSku(sku)));
}

async function buildValidation(
  supabase: ReturnType<typeof createServiceClient>,
  docType: DocType,
  normalized: any
) {
  const missing_fields: string[] = [];
  const warnings: string[] = [];

  if (!normalized?.tour_id) missing_fields.push('tour_id');

  if (docType === 'po') {
    if (!normalized?.po_number) missing_fields.push('po_number');
    if (!normalized?.vendor) missing_fields.push('vendor');
    if (!normalized?.line_items?.length) missing_fields.push('line_items');
  }

  if (docType === 'packing-list') {
    if (!normalized?.delivery_number) missing_fields.push('delivery_number');
    if (!normalized?.po_number) missing_fields.push('po_number');
    if (!normalized?.received_date) missing_fields.push('received_date');
    if (!normalized?.received_location) missing_fields.push('received_location');
    if (!normalized?.received_by) missing_fields.push('received_by');
  }

  if (docType === 'sales-report' || docType === 'settlement') {
    const hasShowIdentity =
      normalized?.show_id || (normalized?.show_date && normalized?.venue_name);
    if (!hasShowIdentity) missing_fields.push('show_identity');
  }

  if (docType === 'sales-report') {
    if (!normalized?.line_items?.length) missing_fields.push('line_items');
    const totalGross = toNumber(normalized?.total_gross);
    const lineGross = (normalized?.line_items ?? []).reduce(
      (sum: number, item: any) => sum + toNumber(item?.gross_sales),
      0
    );
    if (totalGross && Math.abs(totalGross - lineGross) > 1) {
      warnings.push('Line item gross total does not match reported gross.');
    }
  }

  if (docType === 'po' || docType === 'packing-list' || docType === 'sales-report') {
    const skus = (normalized?.line_items ?? []).map((item: any) => item?.sku);
    const missingSkus = await findMissingSkus(supabase, skus);
    if (missingSkus.length) {
      warnings.push(`Unknown SKUs: ${missingSkus.join(', ')}`);
    }
  }

  if (docType === 'settlement') {
    const skus = (normalized?.comps ?? []).map((item: any) => item?.sku);
    const missingSkus = await findMissingSkus(supabase, skus);
    if (missingSkus.length) {
      warnings.push(`Unknown comp SKUs: ${missingSkus.join(', ')}`);
    }
  }

  const itemsWithMissingSizes =
    (normalized?.line_items ?? []).filter((item: any) => !item?.size).length +
    (normalized?.comps ?? []).filter((item: any) => !item?.size).length;
  if (itemsWithMissingSizes) {
    warnings.push('Some items are missing size values.');
  }

  return { missing_fields, warnings };
}

async function parseByType(docType: DocType, base64: string) {
  switch (docType) {
    case 'po':
      return parsePurchaseOrder(base64);
    case 'packing-list':
      return parsePackingList(base64);
    case 'sales-report':
      return parseSalesReport(base64);
    case 'settlement':
      return parseSettlementReport(base64);
    default:
      throw new Error(`Unsupported docType ${docType}`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { docType: DocType } }
) {
  try {
    const docType = params.docType;
    if (!['po', 'packing-list', 'sales-report', 'settlement'].includes(docType)) {
      return NextResponse.json({ error: 'Unsupported doc type' }, { status: 400 });
    }

    const formData = await request.formData();
  const file = formData.get('file');
  const tourId = formData.get('tourId')?.toString() ?? null;
  const showId = formData.get('showId')?.toString() ?? null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing PDF file' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const base64 = buffer.toString('base64');

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('parsed_documents')
    .select('id, status, normalized_json, validation')
    .eq('doc_type', docType)
    .eq('source_hash', sourceHash)
    .maybeSingle();

  if (existing?.status === 'posted') {
    return NextResponse.json({
      parsedDocumentId: existing.id,
      normalized_json: existing.normalized_json,
      validation: existing.validation,
      status: existing.status,
      alreadyPosted: true
    });
  }

  const { data: logEntry } = await supabase
    .from('ai_processing_logs')
    .insert({
      doc_type: docType,
      source_hash: sourceHash,
      source_filename: file.name,
      tour_id: tourId,
      show_id: showId,
      status: 'processing'
    })
    .select()
    .single();

  let parsed: any;
  try {
    parsed = await parseByType(docType, base64);
  } catch (error: any) {
    console.error(`[Parse Error] Doc type: ${docType}, File: ${file.name}`);
    console.error('[Parse Error] Error:', error);
    console.error('[Parse Error] Stack:', error.stack);

    const errorMessage = error.message || 'Unknown parsing error';
    const errorDetails = {
      docType,
      fileName: file.name,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };

    if (logEntry?.id) {
      await supabase
        .from('ai_processing_logs')
        .update({
          status: 'error',
          error_message: JSON.stringify(errorDetails)
        })
        .eq('id', logEntry.id);
    }

    return NextResponse.json(
      {
        error: 'Failed to parse document',
        details: errorMessage,
        docType,
        fileName: file.name
      },
      { status: 500 }
    );
  }

  let normalized: any = parsed;
  if (docType === 'po') normalized = normalizePurchaseOrder(parsed, tourId);
  if (docType === 'packing-list') normalized = normalizePackingList(parsed, tourId);
  if (docType === 'sales-report') normalized = normalizeSalesReport(parsed, tourId, showId);
  if (docType === 'settlement') normalized = normalizeSettlement(parsed, tourId, showId);

  const inference = await inferTourAndShow(supabase, normalized);
  const validation = await buildValidation(supabase, docType, normalized);
  const matching = inference;

  const { data: parsedDoc, error } = await supabase
    .from('parsed_documents')
    .upsert(
      {
        doc_type: docType,
        source_hash: sourceHash,
        source_filename: file.name,
        tour_id: tourId,
        show_id: showId,
        extracted_json: parsed,
        normalized_json: normalized,
        validation,
        status: 'draft'
      },
      { onConflict: 'doc_type,source_hash' }
    )
    .select()
    .single();

  if (logEntry?.id) {
    await supabase
      .from('ai_processing_logs')
      .update({ status: 'ok', parsed_json: normalized })
      .eq('id', logEntry.id);
  }

  if (error || !parsedDoc) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to write parsed document' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    parsedDocumentId: parsedDoc.id,
    normalized_json: parsedDoc.normalized_json,
    validation: parsedDoc.validation,
    matching
  });
  } catch (unexpectedError: any) {
    console.error('[Unexpected Error] Uncaught error in POST handler:', unexpectedError);
    console.error('[Unexpected Error] Stack:', unexpectedError?.stack);

    return NextResponse.json(
      {
        error: 'Unexpected server error',
        details: unexpectedError?.message || 'Unknown error',
        type: unexpectedError?.name || 'Error'
      },
      { status: 500 }
    );
  }
}
