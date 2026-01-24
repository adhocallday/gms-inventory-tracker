-- Sample Database Seed Script
-- Based on Ghost 2025 Summer Tour Data

-- Insert Ghost Tour
INSERT INTO tours (id, name, artist, start_date, end_date, status)
VALUES 
  ('123e4567-e89b-12d3-a456-426614174000', 'SKELETOUR NORTH AMERICA 2025', 'Ghost', '2025-07-09', '2025-08-16', 'completed');

-- Insert Products (from Ghost sales data)
INSERT INTO products (id, sku, description, product_type)
VALUES
  ('223e4567-e89b-12d3-a456-426614174001', 'GHOSRX203729BK', 'SKELETOR ITIN TEE', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174002', 'GHOSRX203728BK', 'SKELETA ALBUM COVER ITIN TEE', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174003', 'GHOSRX203730BK', 'EMERITUS ITIN TEE', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174004', 'GHOSNS503396BK', 'Batwing Zip Hoodie', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174005', 'GHOSRX203401BK', 'SKELETON PO HOODIE', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174006', 'GHOSRX203275B', 'Running Shorts (BLACK)', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174007', 'GHOSRX103437OT', 'CRYSTAL WASHED T AT THE GATES', 'apparel'),
  ('223e4567-e89b-12d3-a456-426614174008', 'GHOSNS903279OT', 'IMPERATOR PLUSHIE', 'other'),
  ('223e4567-e89b-12d3-a456-426614174009', 'GHOSRX203254GR', 'GRUCIFIX KEYCHAIN', 'other'),
  ('223e4567-e89b-12d3-a456-426614174010', 'GHOSRX903408OT', 'POLTERGEIST SKELETA LP', 'media'),
  ('223e4567-e89b-12d3-a456-426614174011', 'GHOSRX003463OT', 'SKELETA CD', 'media');

-- Insert Tour Products with Costs (from Ghost COGs data)
INSERT INTO tour_products (tour_id, product_id, blank_unit_cost, print_unit_cost, full_package_cost, suggested_retail, size, is_active)
VALUES
  -- SKELETOR ITIN TEE
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, 'S', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, 'M', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, 'L', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, 'XL', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, '2XL', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', 0, 0, 8.00, 55.00, '3XL', true),

  -- BATWING HOODY (from PO 85655)
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, 'S', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, 'M', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, 'L', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, 'XL', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, '2XL', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174004', 0, 0, 28.50, 125.00, '3XL', true),
  
  -- Shorts
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174006', 0, 0, 5.80, 50.00, 'S', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174006', 0, 0, 5.80, 50.00, 'M', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174006', 0, 0, 5.80, 50.00, 'L', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174006', 0, 0, 5.80, 50.00, 'XL', true),
  ('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174006', 0, 0, 5.80, 50.00, '2XL', true);

-- Insert Purchase Order (from PO 85655)
INSERT INTO purchase_orders (id, po_number, tour_id, vendor, order_date, expected_delivery, status, total_amount)
VALUES
  ('323e4567-e89b-12d3-a456-426614174000', 'PO085655', '123e4567-e89b-12d3-a456-426614174000', 
   'Farstar Industry Limited', '2025-10-14', '2025-11-25', 'received', 197100.00);

-- Insert PO Line Items
INSERT INTO po_line_items (po_id, tour_product_id, quantity_ordered, unit_cost, line_total)
SELECT 
  '323e4567-e89b-12d3-a456-426614174000',
  tp.id,
  CASE tp.size
    WHEN 'S' THEN 500
    WHEN 'M' THEN 1200
    WHEN 'L' THEN 1800
    WHEN 'XL' THEN 1300
    WHEN '2XL' THEN 800
    WHEN '3XL' THEN 400
  END,
  28.50,
  CASE tp.size
    WHEN 'S' THEN 14250.00
    WHEN 'M' THEN 34200.00
    WHEN 'L' THEN 51300.00
    WHEN 'XL' THEN 37050.00
    WHEN '2XL' THEN 22800.00
    WHEN '3XL' THEN 11400.00
  END
FROM tour_products tp
WHERE tp.product_id = '223e4567-e89b-12d3-a456-426614174004'; -- Batwing Hoodie

-- Insert Shows
INSERT INTO shows (id, tour_id, show_date, venue_name, city, state, attendance, capacity, settlement_status)
VALUES
  ('423e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 
   '2025-07-09', 'CFG Bank Arena', 'Baltimore', 'MD', 7937, 10336, 'reconciled');

-- Insert Sales Data (from AtVenu sales report)
-- SKELETOR ITIN TEE
INSERT INTO sales (show_id, tour_product_id, qty_sold, unit_price, gross_sales)
SELECT 
  '423e4567-e89b-12d3-a456-426614174001',
  tp.id,
  CASE tp.size
    WHEN 'S' THEN 87
    WHEN 'M' THEN 209
    WHEN 'L' THEN 251
    WHEN 'XL' THEN 264
    WHEN '2XL' THEN 107
    WHEN '3XL' THEN 63
  END,
  53.00,
  CASE tp.size
    WHEN 'S' THEN 4611.00
    WHEN 'M' THEN 11077.00
    WHEN 'L' THEN 13303.00
    WHEN 'XL' THEN 13992.00
    WHEN '2XL' THEN 5671.00
    WHEN '3XL' THEN 3339.00
  END
FROM tour_products tp
WHERE tp.product_id = '223e4567-e89b-12d3-a456-426614174001'; -- SKELETOR TEE

-- Insert Comps (from settlement - user needs to specify type)
INSERT INTO comps (show_id, tour_product_id, comp_type, quantity)
SELECT 
  '423e4567-e89b-12d3-a456-426614174001',
  tp.id,
  'band', -- User manually selected this
  1
FROM tour_products tp
WHERE tp.product_id = '223e4567-e89b-12d3-a456-426614174003' -- EMERITUS TEE
  AND tp.size = 'XL';

-- Create sample packing list
INSERT INTO packing_lists (id, delivery_number, po_id, received_date, received_location, received_by)
VALUES
  ('523e4567-e89b-12d3-a456-426614174000', 'DELIVERY-001', '323e4567-e89b-12d3-a456-426614174000',
   '2025-11-26', 'Warehouse', 'Oscar Tamayo');

-- Insert packing list items (received quantities match ordered for this example)
INSERT INTO packing_list_items (packing_list_id, po_line_item_id, quantity_received)
SELECT 
  '523e4567-e89b-12d3-a456-426614174000',
  poli.id,
  poli.quantity_ordered
FROM po_line_items poli
WHERE poli.po_id = '323e4567-e89b-12d3-a456-426614174000';

-- Refresh materialized view to update inventory balances
REFRESH MATERIALIZED VIEW inventory_balances;

-- Verify inventory balances
SELECT 
  p.sku,
  p.description,
  tp.size,
  ib.total_received,
  ib.total_sold,
  ib.total_comps,
  ib.balance
FROM inventory_balances ib
JOIN tour_products tp ON tp.tour_id = ib.tour_id AND tp.product_id = ib.product_id AND tp.size = ib.size
JOIN products p ON p.id = ib.product_id
WHERE ib.tour_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY p.sku, tp.size;

-- Sample query: Show sales per head for Ghost tour
SELECT 
  s.show_date,
  s.venue_name,
  s.city,
  SUM(sa.gross_sales) as total_gross,
  s.attendance,
  ROUND(SUM(sa.gross_sales) / NULLIF(s.attendance, 0), 2) as per_head
FROM shows s
LEFT JOIN sales sa ON sa.show_id = s.id
WHERE s.tour_id = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY s.id, s.show_date, s.venue_name, s.city, s.attendance
ORDER BY s.show_date;

-- Sample query: Product sales summary
SELECT 
  p.sku,
  p.description,
  tp.size,
  SUM(sa.qty_sold) as total_sold,
  SUM(sa.gross_sales) as total_gross,
  COUNT(DISTINCT sa.show_id) as shows_sold_at
FROM products p
JOIN tour_products tp ON tp.product_id = p.id
LEFT JOIN sales sa ON sa.tour_product_id = tp.id
WHERE tp.tour_id = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY p.id, p.sku, p.description, tp.size
ORDER BY total_gross DESC;
