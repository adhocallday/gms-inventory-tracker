#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';
const EXCEL_FILE = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';

// Excel date to JS Date
function excelDateToJS(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

async function loadPOsAndPackingLists() {
  console.log('LOADING POs AND PACKING LISTS FROM PRODUCT SHEETS');
  console.log('='.repeat(70));

  const workbook = XLSX.readFile(EXCEL_FILE);

  // Get all product sheets
  const productSheets = workbook.SheetNames.filter(name => {
    return name.includes('T ') || name.includes('HOODY') || name.includes('LP') ||
           name.includes('COMIC') || name.includes('HAT') || name.includes('PLUSHIE') ||
           name.includes('MASK') || name.includes('SLING BAG') || name.includes('CHOKER') ||
           name.includes('KEYCHAIN') || name.includes('PATCH') || name.includes('PROGRAM') ||
           name.includes('ROLLING STONE') || name.includes('CD') || name.includes('CASSETTE') ||
           name.includes('SHORTS') || name.includes('TANK') || name.includes('CROP') || name.includes('RAGLAN');
  });

  console.log(`\nFound ${productSheets.length} product sheets to process`);

  // Get existing shows, products, and tour_products
  const { data: shows } = await supabase
    .from('shows')
    .select('id, show_date, city')
    .eq('tour_id', TOUR_ID)
    .order('show_date');

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, description');

  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('id, product_id, size, products(sku, description)')
    .eq('tour_id', TOUR_ID);

  console.log(`\n Loaded: ${shows.length} shows, ${products.length} products, ${tourProducts.length} tour products`);

  // Track all deliveries across all product sheets
  const allDeliveries = [];

  for (const sheetName of productSheets) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Find SKU and supplier from sheet
    let sku = null;
    let supplier = null;
    let productName = null;

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      // Look for SKU in "Code" field
      const codeIdx = row.findIndex(c => c === 'Code');
      if (codeIdx >= 0 && row[codeIdx + 1]) {
        sku = String(row[codeIdx + 1]).trim();
      }

      // Look for supplier
      const supplierIdx = row.findIndex(c => c === 'Supplier');
      if (supplierIdx >= 0 && row[supplierIdx + 1]) {
        supplier = String(row[supplierIdx + 1]).trim();
      }

      // Look for product name in "Item" row
      const itemIdx = row.findIndex(c => c === 'Item');
      if (itemIdx >= 0 && row[itemIdx + 1]) {
        productName = String(row[itemIdx + 1]).trim();
      }
    }

    if (!sku) {
      console.log(`  ⚠️  ${sheetName}: No SKU found, skipping`);
      continue;
    }

    // Find header row with "Date", "City", "Delivery"
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] === 'Date' && row[1] === 'City') {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.log(`  ⚠️  ${sheetName}: No header row found`);
      continue;
    }

    const headers = data[headerIdx];
    const deliveryIdx = headers.findIndex(c => c === 'Delivery');

    if (deliveryIdx === -1) {
      console.log(`  ⚠️  ${sheetName}: No 'Delivery' column found`);
      continue;
    }

    // Process delivery rows
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const excelDate = row[0];
      const city = row[1];
      const delivery = row[deliveryIdx];

      if (!delivery || delivery === 0 || delivery === null) continue;

      // Find matching show
      const jsDate = excelDateToJS(excelDate);
      if (isNaN(jsDate.getTime())) continue;

      const dateStr = jsDate.toISOString().split('T')[0];
      const matchingShow = shows.find(s => {
        const showDate = new Date(s.show_date).toISOString().split('T')[0];
        return showDate === dateStr && s.city.toLowerCase().includes(city.toLowerCase());
      });

      if (matchingShow) {
        allDeliveries.push({
          sku,
          supplier: supplier || 'Unknown',
          productName,
          sheetName,
          showId: matchingShow.id,
          showCity: city,
          showDate: dateStr,
          deliveryQty: delivery
        });
      }
    }
  }

  console.log(`\n✅ Found ${allDeliveries.length} delivery records across all products`);

  // Group deliveries by show and supplier to create POs
  const posByShowSupplier = {};

  for (const delivery of allDeliveries) {
    const key = `${delivery.showDate}_${delivery.supplier}`;
    if (!posByShowSupplier[key]) {
      posByShowSupplier[key] = {
        showDate: delivery.showDate,
        showCity: delivery.showCity,
        supplier: delivery.supplier,
        deliveries: []
      };
    }
    posByShowSupplier[key].deliveries.push(delivery);
  }

  console.log(`\nGrouped into ${Object.keys(posByShowSupplier).length} purchase orders (by show + supplier)`);

  // Create POs and packing lists
  let createdPOs = 0;
  let createdPackingLists = 0;
  let createdLineItems = 0;

  for (const [key, poData] of Object.entries(posByShowSupplier)) {
    // Create PO
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        tour_id: TOUR_ID,
        vendor: poData.supplier,
        po_number: `PO-${poData.showDate}-${poData.supplier.substring(0, 10).toUpperCase()}`,
        order_date: poData.showDate,
        expected_delivery: poData.showDate,
        status: 'received'
      })
      .select()
      .single();

    if (poError) {
      console.error(`  ❌ Error creating PO for ${poData.showCity}/${poData.supplier}:`, poError.message);
      continue;
    }

    createdPOs++;

    // Create packing list
    const { data: packingList, error: plError} = await supabase
      .from('packing_lists')
      .insert({
        po_id: po.id,
        delivery_number: `DEL-${poData.showDate}-${poData.supplier.substring(0, 10).toUpperCase()}`,
        received_date: poData.showDate,
        received_location: poData.showCity
      })
      .select()
      .single();

    if (plError) {
      console.error(`  ❌ Error creating packing list:`, plError.message);
      continue;
    }

    createdPackingLists++;

    // Create PO line items and packing list items for each delivery
    for (const delivery of poData.deliveries) {
      // Find tour_product for this SKU (assuming OS/One Size for now)
      const tp = tourProducts.find(tp =>
        tp.products.sku === delivery.sku
      );

      if (!tp) {
        console.log(`  ⚠️  No tour_product found for ${delivery.sku}`);
        continue;
      }

      // Create PO line item
      const { data: poLineItem, error: lineError } = await supabase
        .from('po_line_items')
        .insert({
          po_id: po.id,
          tour_product_id: tp.id,
          quantity_ordered: delivery.deliveryQty
        })
        .select()
        .single();

      if (lineError) {
        console.error(`  ❌ Error creating PO line item:`, lineError.message);
        continue;
      }

      // Create packing list item
      const { error: pliError } = await supabase
        .from('packing_list_items')
        .insert({
          packing_list_id: packingList.id,
          po_line_item_id: poLineItem.id,
          quantity_received: delivery.deliveryQty
        });

      if (pliError) {
        console.error(`  ❌ Error creating packing list item:`, pliError.message);
        continue;
      }

      createdLineItems++;
    }

    console.log(`  ✅ ${poData.showCity} / ${poData.supplier}: ${poData.deliveries.length} items`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ PO/PACKING LIST LOADING COMPLETE');
  console.log(`${'='.repeat(70)}`);
  console.log(`  Created ${createdPOs} purchase orders`);
  console.log(`  Created ${createdPackingLists} packing lists`);
  console.log(`  Created ${createdLineItems} line items`);
}

async function main() {
  try {
    await loadPOsAndPackingLists();

    console.log('\nRun verification:');
    console.log('  npm run db:check-all');
    console.log('\nView inventory tracker:');
    console.log('  http://localhost:3000/tours/' + TOUR_ID + '/inventory');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
