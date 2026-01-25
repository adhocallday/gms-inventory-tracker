# GMS Inventory Tracker - Setup Status

## ✅ Completed

### 1. Data Successfully Loaded
- **Sales Data**: 1,990+ records from Ghost 2025 tour
- **Forecast Projections**: 61 size-level projections with baseline scenario
- **Products**: 43 products with costs
- **Shows**: 27 shows
- **Tour Products**: 140 size variants

### 2. Application Built
All dashboard pages are ready:
- Document Review System (`/dashboard/parsed-documents`)
- COGS Reports (`/tours/[id]/cogs`)
- Inventory Tracker (`/tours/[id]/inventory`)
- Projections (`/tours/[id]/projections`)

---

## ⚠️ ACTION REQUIRED: Apply Database Migration

### Problem
The app requires database views that haven't been created yet:
- `product_summary_view` - For COGS calculations
- `show_summary_view` - For show-level metrics
- `po_open_qty_view` - For open PO tracking
- `stock_movement_view` - For inventory movements

### Solution: Apply Migration via Supabase Dashboard

**Steps:**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Navigate to your project
   - Go to **SQL Editor** (left sidebar)

2. **Run the Migration SQL**
   - Click "+ New query"
   - Copy the SQL below and paste it into the editor
   - Click **Run** or press `Cmd/Ctrl + Enter`

3. **Verify Success**
   - You should see "Success. No rows returned" message
   - All 4 views will be created

---

## SQL Migration to Apply

```sql
-- Tracker aligned views + projection overrides bucket support

alter table if exists public.forecast_overrides
  add column if not exists bucket text;

create or replace view public.show_summary_view as
select
  s.id as show_id,
  s.tour_id,
  s.show_date,
  s.venue_name,
  s.city,
  s.state,
  sum(sa.gross_sales) as total_gross,
  s.attendance,
  round(sum(sa.gross_sales) / nullif(s.attendance, 0), 2) as per_head,
  coalesce(sum(c.quantity), 0) as total_comps
from public.shows s
left join public.sales sa on sa.show_id = s.id
left join public.comps c on c.show_id = s.id
group by s.id, s.tour_id, s.show_date, s.venue_name, s.city, s.state, s.attendance;

create or replace view public.product_summary_view as
select
  tp.tour_id,
  p.id as product_id,
  p.sku,
  p.description,
  tp.size,
  sum(sa.qty_sold) as total_sold,
  sum(sa.gross_sales) as total_gross,
  tp.full_package_cost,
  (sum(sa.qty_sold) * tp.full_package_cost) as total_cogs,
  (sum(sa.gross_sales) - (sum(sa.qty_sold) * tp.full_package_cost)) as gross_margin
from public.tour_products tp
join public.products p on p.id = tp.product_id
left join public.sales sa on sa.tour_product_id = tp.id
group by tp.tour_id, p.id, p.sku, p.description, tp.size, tp.full_package_cost;

create or replace view public.po_open_qty_view as
select
  po.id as po_id,
  po.tour_id,
  po.vendor,
  po.status,
  po.po_number,
  po.order_date,
  po.expected_delivery,
  poli.id as po_line_item_id,
  tp.product_id,
  tp.size,
  p.sku,
  p.description,
  poli.quantity_ordered,
  coalesce(sum(pli.quantity_received), 0) as quantity_received,
  (poli.quantity_ordered - coalesce(sum(pli.quantity_received), 0)) as open_quantity
from public.purchase_orders po
join public.po_line_items poli on poli.po_id = po.id
join public.tour_products tp on tp.id = poli.tour_product_id
join public.products p on p.id = tp.product_id
left join public.packing_list_items pli on pli.po_line_item_id = poli.id
group by
  po.id,
  po.tour_id,
  po.vendor,
  po.status,
  po.po_number,
  po.order_date,
  po.expected_delivery,
  poli.id,
  tp.product_id,
  tp.size,
  p.sku,
  p.description,
  poli.quantity_ordered;

create or replace view public.stock_movement_view as
select
  po.tour_id,
  pl.received_date,
  pl.delivery_number,
  p.sku,
  tp.size,
  pli.quantity_received,
  po.vendor
from public.packing_list_items pli
join public.packing_lists pl on pl.id = pli.packing_list_id
join public.po_line_items poli on poli.id = pli.po_line_item_id
join public.purchase_orders po on po.id = poli.po_id
join public.tour_products tp on tp.id = poli.tour_product_id
join public.products p on p.id = tp.product_id;
```

---

## After Applying Migration

### Test the App

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Visit Ghost 2025 Tour Pages**
   - Tour ID: `123e4567-e89b-12d3-a456-426614174000`
   - COGS: `http://localhost:3000/tours/123e4567-e89b-12d3-a456-426614174000/cogs`
   - Inventory: `http://localhost:3000/tours/123e4567-e89b-12d3-a456-426614174000/inventory`
   - Projections: `http://localhost:3000/tours/123e4567-e89b-12d3-a456-426614174000/projections`

3. **Verify Data Display**
   - COGS should show products with sales data
   - Inventory should show balances (currently 0 since no POs loaded)
   - Projections should show forecast overrides

### Run Verification Script

```bash
export $(cat .env.local | grep -v "^#" | xargs) && node scripts/test-api-endpoints.js
```

Expected output:
```
✅ product_summary_view: Found products
✅ show_summary_view: Found shows
✅ inventory_balances: Exists
✅ forecast_scenarios: Found scenarios
✅ forecast_overrides: Found overrides
```

---

## Known Issues & Next Steps

### Current Limitations

1. **Sales Pricing**: All sales have `unit_price = 0` and `gross_sales = 0`
   - Need to load pricing from "Selling Prices" sheet
   - Can be updated with a follow-up script

2. **Inventory Balances**: All show 0 because no purchase orders loaded
   - Ghost Excel file doesn't contain PO data
   - Will populate when POs are created via the app

3. **Size Distribution**: Sales distributed equally across sizes
   - Actual per-show size breakdowns not in Excel
   - Total quantities match Excel tracker

### Future Enhancements

1. Load selling prices to populate `unit_price` and `gross_sales`
2. Import historical purchase orders if available
3. Add real per-show size breakdowns if POS data available
4. Set up automatic Excel sync scripts

---

## Files Created This Session

### Data Loading Scripts
- `scripts/load-all-ghost-data.js` - Main data loader
- `scripts/load-ghost-sales-limited.js` - Test loader (3 products)
- `scripts/sync-ghost-data.js` - Excel vs DB comparison
- `scripts/extract-ghost-data.js` - Basic data extraction
- `scripts/examine-product-sheet.js` - Sheet structure analyzer
- `scripts/examine-projection-sheet.js` - Projection sheet analyzer

### Verification Scripts
- `scripts/verify-loaded-data.js` - Verify loaded data
- `scripts/test-api-endpoints.js` - Test API queries
- `scripts/check-migrations.js` - Check applied migrations
- `scripts/test-db.js` - Test database connection

### Migration Scripts
- `scripts/run-migration.js` - Apply migration (requires psql)
- `scripts/apply-tracker-views.js` - Migration instructions

### Documentation
- `scripts/DATA_LOAD_SUMMARY.md` - Data load details
- `SETUP_COMPLETE.md` - This file

---

## Quick Reference

### Ghost 2025 Tour
- **Tour ID**: `123e4567-e89b-12d3-a456-426614174000`
- **Name**: SKELETOUR NORTH AMERICA 2025
- **Shows**: 27 shows
- **Products**: 43 products
- **Sales Records**: 1,990+

### Database Tables
- `tours`, `shows`, `products`, `tour_products` - ✅ Populated
- `sales` - ✅ Populated (1,990 records)
- `forecast_scenarios` - ✅ Populated (1 scenario)
- `forecast_overrides` - ✅ Populated (61 overrides)
- `purchase_orders`, `packing_lists` - ⚠️ Empty (no data in Excel)

### Database Views (Need Migration)
- `product_summary_view` - ❌ Not created yet
- `show_summary_view` - ❌ Not created yet
- `po_open_qty_view` - ❌ Not created yet
- `stock_movement_view` - ❌ Not created yet
- `inventory_balances` - ✅ Already exists

---

## Support

If you encounter issues after applying the migration, check:

1. **View Creation**: Run `scripts/check-migrations.js` to verify
2. **Sales Data**: Run `scripts/verify-loaded-data.js` to check data
3. **API Endpoints**: Run `scripts/test-api-endpoints.js` to test queries
4. **Console Errors**: Check browser console and server logs for errors

The app is ready once the migration is applied! 🎉
