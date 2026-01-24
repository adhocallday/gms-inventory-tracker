import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';

function normalizeSize(size?: string) {
  return size && size.trim() ? size.trim() : 'One-Size';
}

function guessProductType(size?: string) {
  if (!size) return 'other';
  const normalized = normalizeSize(size).toLowerCase();
  if (['s', 'm', 'l', 'xl', '2xl', '3xl'].includes(normalized)) {
    return 'apparel';
  }
  return 'other';
}

async function getOrCreateProduct(
  supabase: ReturnType<typeof createServiceClient>,
  sku: string,
  description?: string,
  size?: string
) {
  const { data: existing } = await supabase
    .from('products')
    .select('id, description')
    .eq('sku', sku)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const productId = crypto.randomUUID();
  await supabase
    .from('products')
    .insert({
      id: productId,
      sku,
      description: description || sku,
      product_type: guessProductType(size)
    });

  return productId;
}

async function getOrCreateTourProduct(
  supabase: ReturnType<typeof createServiceClient>,
  tourId: string,
  productId: string,
  size?: string,
  unitCost?: number
) {
  const normalizedSize = normalizeSize(size);
  const { data: existing } = await supabase
    .from('tour_products')
    .select('id')
    .eq('tour_id', tourId)
    .eq('product_id', productId)
    .eq('size', normalizedSize)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted } = await supabase
    .from('tour_products')
    .insert({
      tour_id: tourId,
      product_id: productId,
      size: normalizedSize,
      full_package_cost: unitCost ?? 0,
      blank_unit_cost: 0,
      print_unit_cost: 0,
      suggested_retail: null,
      is_active: true
    })
    .select('id')
    .single();

  return inserted?.id as string;
}

async function upsertPurchaseOrder(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any,
  sourceDocId: string
) {
  const { data: existing } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('po_number', payload.po_number)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('purchase_orders')
      .update({
        tour_id: payload.tour_id,
        vendor: payload.vendor,
        order_date: payload.order_date,
        expected_delivery: payload.expected_delivery_date || null,
        status: payload.status || 'open',
        total_amount: payload.total_amount || null,
        source_doc_id: sourceDocId
      })
      .eq('id', existing.id);

    return existing.id as string;
  }

  const poId = crypto.randomUUID();
  await supabase.from('purchase_orders').insert({
    id: poId,
    po_number: payload.po_number,
    tour_id: payload.tour_id,
    vendor: payload.vendor,
    order_date: payload.order_date,
    expected_delivery: payload.expected_delivery_date || null,
    status: payload.status || 'open',
    total_amount: payload.total_amount || null,
    source_doc_id: sourceDocId
  });

  return poId;
}

async function postPurchaseOrder(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any,
  sourceDocId: string
) {
  const poId = await upsertPurchaseOrder(supabase, payload, sourceDocId);
  const lineItemIds: string[] = [];

  for (const item of payload.line_items || []) {
    if (!item.sku) continue;
    const productId = await getOrCreateProduct(
      supabase,
      item.sku,
      item.description,
      item.size
    );
    const tourProductId = await getOrCreateTourProduct(
      supabase,
      payload.tour_id,
      productId,
      item.size,
      item.unit_cost
    );

    const { data: inserted } = await supabase
      .from('po_line_items')
      .insert({
        po_id: poId,
        tour_product_id: tourProductId,
        quantity_ordered: item.quantity_ordered ?? 0,
        unit_cost: item.unit_cost ?? 0,
        line_total: item.line_total ?? 0
      })
      .select('id')
      .single();

    if (inserted?.id) lineItemIds.push(inserted.id);
  }

  return { poId, lineItemIds };
}

async function postPackingList(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any,
  sourceDocId: string
) {
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('id, tour_id')
    .eq('po_number', payload.po_number)
    .maybeSingle();

  if (!po?.id) {
    throw new Error(`PO not found for ${payload.po_number}`);
  }

  const packingListId = crypto.randomUUID();
  await supabase.from('packing_lists').insert({
    id: packingListId,
    delivery_number: payload.delivery_number,
    po_id: po.id,
    received_date: payload.received_date,
    received_location: payload.received_location,
    received_by: payload.received_by,
    source_doc_id: sourceDocId
  });

  const itemIds: string[] = [];

  for (const item of payload.line_items || []) {
    if (!item.sku) continue;
    const productId = await getOrCreateProduct(
      supabase,
      item.sku,
      item.description,
      item.size
    );
    const tourProductId = await getOrCreateTourProduct(
      supabase,
      po.tour_id,
      productId,
      item.size
    );

    let { data: poLine } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('po_id', po.id)
      .eq('tour_product_id', tourProductId)
      .maybeSingle();

    if (!poLine?.id) {
      const { data: insertedPoLine } = await supabase
        .from('po_line_items')
        .insert({
          po_id: po.id,
          tour_product_id: tourProductId,
          quantity_ordered: 0,
          unit_cost: 0,
          line_total: 0
        })
        .select('id')
        .single();

      poLine = insertedPoLine ?? null;
    }

    const { data: insertedItem } = await supabase
      .from('packing_list_items')
      .insert({
        packing_list_id: packingListId,
        po_line_item_id: poLine?.id,
        quantity_received: item.quantity_received ?? 0
      })
      .select('id')
      .single();

    if (insertedItem?.id) itemIds.push(insertedItem.id);
  }

  return { packingListId, itemIds };
}

async function getOrCreateShow(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any
) {
  if (payload.show_id) return payload.show_id;

  const { data: existing } = await supabase
    .from('shows')
    .select('id')
    .eq('tour_id', payload.tour_id)
    .eq('show_date', payload.show_date)
    .eq('venue_name', payload.venue_name)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const showId = crypto.randomUUID();
  await supabase.from('shows').insert({
    id: showId,
    tour_id: payload.tour_id,
    show_date: payload.show_date,
    venue_name: payload.venue_name,
    city: payload.city || null,
    state: payload.state || null,
    attendance: payload.attendance || null,
    capacity: payload.capacity || null,
    settlement_status: 'unreconciled'
  });

  return showId;
}

async function postSalesReport(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any,
  sourceDocId: string
) {
  const showId = await getOrCreateShow(supabase, payload);
  const saleIds: string[] = [];

  for (const item of payload.line_items || []) {
    if (!item.sku) continue;
    const productId = await getOrCreateProduct(
      supabase,
      item.sku,
      item.description,
      item.size
    );
    const tourProductId = await getOrCreateTourProduct(
      supabase,
      payload.tour_id,
      productId,
      item.size
    );

    const { data: inserted } = await supabase
      .from('sales')
      .insert({
        show_id: showId,
        tour_product_id: tourProductId,
        qty_sold: item.qty_sold ?? 0,
        unit_price: item.unit_price ?? 0,
        gross_sales: item.gross_sales ?? 0,
        source_doc_id: sourceDocId
      })
      .select('id')
      .single();

    if (inserted?.id) saleIds.push(inserted.id);
  }

  return { showId, saleIds };
}

async function postSettlement(
  supabase: ReturnType<typeof createServiceClient>,
  payload: any,
  sourceDocId: string
) {
  const showId = await getOrCreateShow(supabase, payload);
  const compIds: string[] = [];

  for (const comp of payload.comps || []) {
    if (!comp.sku) continue;
    const productId = await getOrCreateProduct(
      supabase,
      comp.sku,
      comp.description,
      comp.size
    );
    const tourProductId = await getOrCreateTourProduct(
      supabase,
      payload.tour_id,
      productId,
      comp.size
    );

    const { data: inserted } = await supabase
      .from('comps')
      .insert({
        show_id: showId,
        tour_product_id: tourProductId,
        comp_type: comp.comp_type || 'other',
        quantity: comp.quantity ?? 0,
        source_doc_id: sourceDocId
      })
      .select('id')
      .single();

    if (inserted?.id) compIds.push(inserted.id);
  }

  return { showId, compIds };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { data: doc, error } = await supabase
      .from('parsed_documents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Parsed document not found' }, { status: 404 });
    }

    const normalized = doc.normalized_json || doc.extracted_json || {};
    const merged = doc.ui_overrides || normalized;

    let receipt: Record<string, any> = {};

    switch (doc.doc_type) {
      case 'po':
        receipt = await postPurchaseOrder(supabase, merged, doc.id);
        break;
      case 'packing-list':
        receipt = await postPackingList(supabase, merged, doc.id);
        break;
      case 'sales-report':
        receipt = await postSalesReport(supabase, merged, doc.id);
        break;
      case 'settlement':
        receipt = await postSettlement(supabase, merged, doc.id);
        break;
      default:
        throw new Error(`Unsupported doc_type: ${doc.doc_type}`);
    }

    const { data: updated } = await supabase
      .from('parsed_documents')
      .update({
        status: 'posted',
        post_receipt: receipt,
        updated_at: new Date().toISOString()
      })
      .eq('id', doc.id)
      .select()
      .single();

    return NextResponse.json({ data: updated, receipt });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to post document', details: error.message },
      { status: 500 }
    );
  }
}
