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

type Supabase = ReturnType<typeof createServiceClient>;

type LineRef = { sku?: string; description?: string; size?: string; unit_cost?: number };

function lineKey(sku: string, size?: string) {
  return `${sku}|${normalizeSize(size)}`;
}

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Resolves every line's SKU and size to a tour_product id in a fixed number of
 * queries, creating missing products and tour_products in bulk.
 */
async function resolveTourProducts(supabase: Supabase, tourId: string, lines: LineRef[]) {
  const withSku = lines.filter((line): line is LineRef & { sku: string } => Boolean(line.sku));
  const skus = Array.from(new Set(withSku.map((line) => line.sku)));
  const byKey = new Map<string, string>();
  if (skus.length === 0) return byKey;

  const productIdBySku = new Map<string, string>();
  const existingProducts = check(
    await supabase.from('products').select('id, sku').in('sku', skus),
    'Loading products'
  );
  for (const product of existingProducts ?? []) productIdBySku.set(product.sku, product.id);

  const missingProducts = skus
    .filter((sku) => !productIdBySku.has(sku))
    .map((sku) => {
      const line = withSku.find((candidate) => candidate.sku === sku)!;
      return {
        id: crypto.randomUUID(),
        sku,
        description: line.description || sku,
        product_type: guessProductType(line.size)
      };
    });
  if (missingProducts.length > 0) {
    check(await supabase.from('products').insert(missingProducts), 'Creating products');
    for (const product of missingProducts) productIdBySku.set(product.sku, product.id);
  }

  const productIds = Array.from(new Set(productIdBySku.values()));
  const existingTourProducts = check(
    await supabase
      .from('tour_products')
      .select('id, product_id, size')
      .eq('tour_id', tourId)
      .in('product_id', productIds),
    'Loading tour products'
  );
  const skuByProductId = new Map(Array.from(productIdBySku, ([sku, id]) => [id, sku]));
  for (const tp of existingTourProducts ?? []) {
    byKey.set(lineKey(skuByProductId.get(tp.product_id)!, tp.size), tp.id);
  }

  const missingTourProducts = new Map<string, Record<string, unknown>>();
  for (const line of withSku) {
    const key = lineKey(line.sku, line.size);
    if (byKey.has(key) || missingTourProducts.has(key)) continue;
    missingTourProducts.set(key, {
      id: crypto.randomUUID(),
      tour_id: tourId,
      product_id: productIdBySku.get(line.sku),
      size: normalizeSize(line.size),
      full_package_cost: line.unit_cost ?? 0,
      blank_unit_cost: 0,
      print_unit_cost: 0,
      suggested_retail: null,
      is_active: true
    });
  }
  if (missingTourProducts.size > 0) {
    check(
      await supabase.from('tour_products').insert(Array.from(missingTourProducts.values())),
      'Creating tour products'
    );
    missingTourProducts.forEach((row, key) => byKey.set(key, row.id as string));
  }

  return byKey;
}

async function upsertPurchaseOrder(
  supabase: Supabase,
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
  supabase: Supabase,
  payload: any,
  sourceDocId: string
) {
  const poId = await upsertPurchaseOrder(supabase, payload, sourceDocId);
  const lines = (payload.line_items || []).filter((item: any) => item.sku);
  const tourProducts = await resolveTourProducts(supabase, payload.tour_id, lines);

  const rows = lines.map((item: any) => ({
    po_id: poId,
    tour_product_id: tourProducts.get(lineKey(item.sku, item.size)),
    quantity_ordered: item.quantity_ordered ?? 0,
    unit_cost: item.unit_cost ?? 0,
    line_total: item.line_total ?? 0
  }));
  const inserted = rows.length
    ? check(await supabase.from('po_line_items').insert(rows).select('id'), 'Saving PO lines')
    : [];

  return { poId, lineItemIds: (inserted ?? []).map((row: { id: string }) => row.id) };
}

async function postPackingList(
  supabase: Supabase,
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
  const packingListInsert = await supabase.from('packing_lists').insert({
    id: packingListId,
    delivery_number: payload.delivery_number,
    po_id: po.id,
    received_date: payload.received_date,
    received_location: payload.received_location,
    received_by: payload.received_by,
    source_doc_id: sourceDocId
  });
  check(packingListInsert, 'Saving packing list');

  const lines = (payload.line_items || []).filter((item: any) => item.sku);
  const tourProducts = await resolveTourProducts(supabase, po.tour_id, lines);

  const poLineByTourProduct = new Map<string, string>();
  const existingPoLines = check(
    await supabase.from('po_line_items').select('id, tour_product_id').eq('po_id', po.id),
    'Loading PO lines'
  );
  for (const line of existingPoLines ?? []) poLineByTourProduct.set(line.tour_product_id, line.id);

  // Items received that were never on the PO still get a PO line, at zero ordered.
  const unorderedIds = Array.from(new Set(
    lines
      .map((item: any) => tourProducts.get(lineKey(item.sku, item.size))!)
      .filter((id: string) => !poLineByTourProduct.has(id))
  )) as string[];
  if (unorderedIds.length > 0) {
    const created = check(
      await supabase
        .from('po_line_items')
        .insert(unorderedIds.map((id) => ({
          po_id: po.id,
          tour_product_id: id,
          quantity_ordered: 0,
          unit_cost: 0,
          line_total: 0
        })))
        .select('id, tour_product_id'),
      'Adding unordered PO lines'
    );
    for (const line of created ?? []) poLineByTourProduct.set(line.tour_product_id, line.id);
  }

  // One row per PO line: the same SKU and size listed twice on a packing list is summed.
  const received = new Map<string, number>();
  for (const item of lines) {
    const poLineId = poLineByTourProduct.get(tourProducts.get(lineKey(item.sku, item.size))!)!;
    received.set(poLineId, (received.get(poLineId) ?? 0) + (item.quantity_received ?? 0));
  }
  const inserted = received.size
    ? check(
        await supabase
          .from('packing_list_items')
          .insert(Array.from(received, ([poLineId, quantity]) => ({
            packing_list_id: packingListId,
            po_line_item_id: poLineId,
            quantity_received: quantity
          })))
          .select('id'),
        'Saving packing list lines'
      )
    : [];

  return { packingListId, itemIds: (inserted ?? []).map((row: { id: string }) => row.id) };
}

async function getOrCreateShow(
  supabase: Supabase,
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
  supabase: Supabase,
  payload: any,
  sourceDocId: string
) {
  const showId = await getOrCreateShow(supabase, payload);
  const lines = (payload.line_items || []).filter((item: any) => item.sku);
  const tourProducts = await resolveTourProducts(supabase, payload.tour_id, lines);

  // One row per show and tour product; a repeated SKU and size is summed so the
  // upsert never touches the same row twice. Re-posting a show replaces its sales.
  const rows = new Map<string, Record<string, any>>();
  for (const item of lines) {
    const tourProductId = tourProducts.get(lineKey(item.sku, item.size))!;
    const row = rows.get(tourProductId) ?? {
      show_id: showId,
      tour_product_id: tourProductId,
      qty_sold: 0,
      unit_price: item.unit_price ?? 0,
      gross_sales: 0,
      source_doc_id: sourceDocId
    };
    row.qty_sold += item.qty_sold ?? 0;
    row.gross_sales += item.gross_sales ?? 0;
    rows.set(tourProductId, row);
  }
  const saved = rows.size
    ? check(
        await supabase
          .from('sales')
          .upsert(Array.from(rows.values()), { onConflict: 'show_id,tour_product_id' })
          .select('id'),
        'Saving sales'
      )
    : [];

  return { showId, saleIds: (saved ?? []).map((row: { id: string }) => row.id) };
}

async function postSettlement(
  supabase: Supabase,
  payload: any,
  sourceDocId: string
) {
  const showId = await getOrCreateShow(supabase, payload);
  const comps = (payload.comps || []).filter((comp: any) => comp.sku);
  const tourProducts = await resolveTourProducts(supabase, payload.tour_id, comps);

  const rows = comps.map((comp: any) => ({
    show_id: showId,
    tour_product_id: tourProducts.get(lineKey(comp.sku, comp.size)),
    comp_type: comp.comp_type || 'other',
    quantity: comp.quantity ?? 0,
    source_doc_id: sourceDocId
  }));
  const inserted = rows.length
    ? check(await supabase.from('comps').insert(rows).select('id'), 'Saving comps')
    : [];

  return { showId, compIds: (inserted ?? []).map((row: { id: string }) => row.id) };
}

function buildPayload(doc: any) {
  const normalized = doc.normalized_json || doc.extracted_json || {};
  const overrides = doc.ui_overrides || {};
  return {
    ...normalized,
    ...overrides,
    tour_id: overrides.tour_id ?? normalized.tour_id ?? doc.tour_id ?? null,
    show_id: overrides.show_id ?? normalized.show_id ?? doc.show_id ?? null
  };
}

function validatePayload(docType: string, payload: any) {
  if (!payload.tour_id) {
    throw new Error('Tour is required before posting.');
  }
  if (docType === 'po' && !payload.po_number) {
    throw new Error('PO number is required.');
  }
  if (docType === 'packing-list' && !payload.po_number) {
    throw new Error('PO number is required for packing list.');
  }
  if (docType === 'sales-report' || docType === 'settlement') {
    const hasShowIdentity = payload.show_id || (payload.show_date && payload.venue_name);
    if (!hasShowIdentity) {
      throw new Error('Show identity is required (show or show date/venue).');
    }
  }
}

export async function postParsedDocument(
  supabase: Supabase,
  docId: string
) {
  const { data: doc, error } = await supabase
    .from('parsed_documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (error || !doc) {
    throw new Error('Parsed document not found');
  }

  if (doc.status === 'posted') {
    return { updated: doc, receipt: doc.post_receipt ?? {} };
  }

  const payload = buildPayload(doc);
  validatePayload(doc.doc_type, payload);

  let receipt: Record<string, any> = {};

  switch (doc.doc_type) {
    case 'po':
      receipt = await postPurchaseOrder(supabase, payload, doc.id);
      break;
    case 'packing-list':
      receipt = await postPackingList(supabase, payload, doc.id);
      break;
    case 'sales-report':
      receipt = await postSalesReport(supabase, payload, doc.id);
      break;
    case 'settlement':
      receipt = await postSettlement(supabase, payload, doc.id);
      break;
    default:
      throw new Error(`Unsupported doc_type: ${doc.doc_type}`);
  }

  // inventory_balances is a materialized view: bring it current after every post.
  check(await supabase.rpc('refresh_inventory_balances'), 'Refreshing inventory balances');

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

  return { updated, receipt };
}
