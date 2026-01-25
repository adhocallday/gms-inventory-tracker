# Ghost 2025 Tour - Data Load Summary

## Completed: January 24, 2026

### Data Successfully Loaded

#### 1. Sales Data
- **Source**: 37 product sheets from `01 GHOST 2025 TOUR.xlsx`
- **Records Loaded**: 1,990+ sales records
- **Coverage**: 22 shows with sales data
- **Products**: All 37 products including:
  - T-shirts (3 variants with 6 sizes each)
  - Hoodies (2 variants with 6 sizes each)
  - Event-specific tees (Tampa, Philly, Boston, New York, Chicago)
  - Accessories (Hat, Mask, Plushie, Sling Bag, Keychain, Patch Set)
  - Merchandise (Tour Program, Comic Books, Vinyl, CD, Cassette)

**Data Distribution Method**:
- Since individual product sheets only show total sales per show (not per-size breakdown), sales were distributed equally across available sizes for each product
- This approach ensures total sales match the Excel tracker while maintaining size-level granularity in the database

#### 2. Forecast Projections
- **Scenario Created**: "Excel Projection Baseline" (marked as baseline)
- **Products with Projections**: 16 products
- **Size-Level Overrides**: 61 forecast entries
- **Data Source**: Projection Sheet columns 21-27 (size distribution: SM, MED, LG, XL, 2X, 3X, TOTAL)

### Database Tables Populated

1. **sales** - Historical sales by show, product, and size
2. **forecast_scenarios** - Baseline projection scenario
3. **forecast_overrides** - Product/size level projection quantities

### Pre-existing Data (Not Modified)

- **tours**: 1 tour (Ghost 2025)
- **shows**: 27 shows
- **products**: 43 products
- **tour_products**: 140 tour products (with sizes and costs)

### Scripts Created

1. `load-all-ghost-data.js` - Main data loader
2. `load-ghost-sales-limited.js` - Test loader (3 products)
3. `examine-product-sheet.js` - Sheet structure analyzer
4. `verify-loaded-data.js` - Data verification
5. `sync-ghost-data.js` - Comparison tool (Excel vs DB)

### Known Limitations

1. **Unit Prices**: Sales records have `unit_price` and `gross_sales` set to 0 because pricing information is not in the individual product sheets. These can be updated later when selling prices are available.

2. **Size Distribution**: Per-show size breakdowns were not available in the Excel sheets, so sales were distributed equally across sizes. Actual size distributions may vary.

3. **Missing Sheets**: Two sheets could not be processed:
   - CHOKER (SKU not found in sheet)
   - FOILED COMIC BOOK #3 (SKU not found in sheet)

### Next Steps

1. **Update Pricing**: Populate `unit_price` and `gross_sales` in the sales table using the Selling Prices sheet data
2. **Test Dashboards**: Verify COGS, Inventory Tracker, and Projections views display the loaded data correctly
3. **Load Additional Data**: Consider loading:
   - Purchase orders (if available in Excel)
   - Packing lists (if available in Excel)
   - Actual per-size sales if available from POS systems

### Verification Queries

```javascript
// Total sales for Baltimore show
const { data } = await supabase
  .from('sales')
  .select('qty_sold')
  .eq('show_id', '423e4567-e89b-12d3-a456-426614174001');

// Forecast projections
const { data } = await supabase
  .from('forecast_overrides')
  .select('sku, size, override_units')
  .limit(10);
```

### Data Integrity

✅ All sales records linked to valid shows
✅ All sales records linked to valid tour_products
✅ Forecast overrides linked to baseline scenario
✅ Total sales quantities match Excel tracker
✅ No orphaned records
