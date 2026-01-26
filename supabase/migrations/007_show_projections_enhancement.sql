-- Migration: Show Projections Enhancement
-- Adds comp tracking, reorder thresholds, and running balance calculation
-- This enables Excel-like show-by-show inventory tracking with running balances

-- ============================================================================
-- 1. SHOW_COMPS
-- ============================================================================
-- Tracks comps (complimentary items) by category per show
-- Categories: band, gms, show, trailer (other can be added)

CREATE TABLE IF NOT EXISTS show_comps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  size VARCHAR(10), -- NULL for one-size products, or 'S', 'M', 'L', 'XL', '2XL', '3XL'
  comp_type VARCHAR(20) NOT NULL CHECK (comp_type IN ('band', 'gms', 'show', 'trailer', 'other')),
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_comp_per_show_sku_size_type
    UNIQUE(show_id, sku, size, comp_type)
);

-- Indexes
CREATE INDEX idx_show_comps_tour ON show_comps(tour_id);
CREATE INDEX idx_show_comps_show ON show_comps(show_id);
CREATE INDEX idx_show_comps_sku ON show_comps(sku);
CREATE INDEX idx_show_comps_type ON show_comps(comp_type);

-- RLS Policies
ALTER TABLE show_comps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view show comps"
  ON show_comps FOR SELECT
  USING (true);

CREATE POLICY "Users can insert show comps"
  ON show_comps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update show comps"
  ON show_comps FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete show comps"
  ON show_comps FOR DELETE
  USING (true);

-- ============================================================================
-- 2. REORDER_THRESHOLDS
-- ============================================================================
-- Configurable reorder alerts per product/size per tour

CREATE TABLE IF NOT EXISTS reorder_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  size VARCHAR(10), -- NULL applies to all sizes
  minimum_balance INTEGER NOT NULL DEFAULT 0,
  reorder_quantity INTEGER, -- Suggested quantity to reorder
  lead_time_days INTEGER DEFAULT 14, -- Expected fulfillment time
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_threshold_per_tour_sku_size
    UNIQUE(tour_id, sku, size)
);

-- Indexes
CREATE INDEX idx_reorder_thresholds_tour ON reorder_thresholds(tour_id);
CREATE INDEX idx_reorder_thresholds_sku ON reorder_thresholds(sku);
CREATE INDEX idx_reorder_thresholds_active ON reorder_thresholds(tour_id, is_active);

-- RLS Policies
ALTER TABLE reorder_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reorder thresholds"
  ON reorder_thresholds FOR SELECT
  USING (true);

CREATE POLICY "Users can insert reorder thresholds"
  ON reorder_thresholds FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update reorder thresholds"
  ON reorder_thresholds FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete reorder thresholds"
  ON reorder_thresholds FOR DELETE
  USING (true);

-- ============================================================================
-- 3. INITIAL_INVENTORY
-- ============================================================================
-- Stores the starting inventory (Stock B/F) for each product at tour start
-- This is the baseline from which running balances are calculated

CREATE TABLE IF NOT EXISTS initial_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  size VARCHAR(10),
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_initial_inventory_per_scenario_sku_size
    UNIQUE(scenario_id, sku, size)
);

-- Indexes
CREATE INDEX idx_initial_inventory_tour ON initial_inventory(tour_id);
CREATE INDEX idx_initial_inventory_scenario ON initial_inventory(scenario_id);
CREATE INDEX idx_initial_inventory_sku ON initial_inventory(sku);

-- RLS Policies
ALTER TABLE initial_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view initial inventory"
  ON initial_inventory FOR SELECT
  USING (true);

CREATE POLICY "Users can insert initial inventory"
  ON initial_inventory FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update initial inventory"
  ON initial_inventory FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete initial inventory"
  ON initial_inventory FOR DELETE
  USING (true);

-- ============================================================================
-- 4. SHOW_DELIVERIES
-- ============================================================================
-- Tracks deliveries/replenishments at each show
-- Separate from product_stock_movements for simpler querying

CREATE TABLE IF NOT EXISTS show_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  size VARCHAR(10),
  quantity INTEGER NOT NULL DEFAULT 0,
  delivery_type VARCHAR(20) DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'return', 'adjustment')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_show_deliveries_tour ON show_deliveries(tour_id);
CREATE INDEX idx_show_deliveries_show ON show_deliveries(show_id);
CREATE INDEX idx_show_deliveries_sku ON show_deliveries(sku);

-- RLS Policies
ALTER TABLE show_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view show deliveries"
  ON show_deliveries FOR SELECT
  USING (true);

CREATE POLICY "Users can insert show deliveries"
  ON show_deliveries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update show deliveries"
  ON show_deliveries FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete show deliveries"
  ON show_deliveries FOR DELETE
  USING (true);

-- ============================================================================
-- 5. SHOW_RUNNING_BALANCES VIEW
-- ============================================================================
-- Calculates running balance per product/size across shows chronologically
-- Formula: Stock B/F + Cumulative Deliveries - Cumulative Sales - Cumulative Comps

CREATE OR REPLACE VIEW show_running_balances AS
WITH ordered_shows AS (
  SELECT
    s.id AS show_id,
    s.tour_id,
    s.show_date,
    s.city,
    s.venue_name,
    ROW_NUMBER() OVER (PARTITION BY s.tour_id ORDER BY s.show_date, s.id) AS show_number
  FROM shows s
  WHERE s.show_date IS NOT NULL
),
-- Get all unique product/size combinations for each tour
tour_products AS (
  SELECT DISTINCT
    tour_id,
    sku,
    size
  FROM (
    SELECT tour_id, sku, size FROM product_show_projections
    UNION
    SELECT tour_id, sku, size FROM show_comps
    UNION
    SELECT tour_id, sku, size FROM show_deliveries
  ) combined
),
-- Cross join shows with products to get all combinations
show_product_grid AS (
  SELECT
    os.show_id,
    os.tour_id,
    os.show_date,
    os.city,
    os.venue_name,
    os.show_number,
    tp.sku,
    tp.size
  FROM ordered_shows os
  JOIN tour_products tp ON tp.tour_id = os.tour_id
),
-- Get projected sales per show (from product_show_projections)
projected_sales AS (
  SELECT
    psp.show_id,
    psp.sku,
    psp.size,
    psp.projected_units
  FROM product_show_projections psp
),
-- Get actual sales per show (from product_stock_movements)
actual_sales AS (
  SELECT
    psm.show_id,
    psm.sku,
    psm.size,
    SUM(psm.units) AS actual_units
  FROM product_stock_movements psm
  WHERE psm.movement_type = 'sale'
  GROUP BY psm.show_id, psm.sku, psm.size
),
-- Aggregate deliveries per show
deliveries AS (
  SELECT
    sd.show_id,
    sd.sku,
    sd.size,
    SUM(CASE WHEN sd.delivery_type = 'return' THEN -sd.quantity ELSE sd.quantity END) AS delivery_units
  FROM show_deliveries sd
  GROUP BY sd.show_id, sd.sku, sd.size
),
-- Aggregate comps per show
comps AS (
  SELECT
    sc.show_id,
    sc.sku,
    sc.size,
    SUM(sc.quantity) AS comp_units,
    SUM(CASE WHEN sc.comp_type = 'band' THEN sc.quantity ELSE 0 END) AS band_comp,
    SUM(CASE WHEN sc.comp_type = 'gms' THEN sc.quantity ELSE 0 END) AS gms_comp,
    SUM(CASE WHEN sc.comp_type = 'show' THEN sc.quantity ELSE 0 END) AS show_comp,
    SUM(CASE WHEN sc.comp_type = 'trailer' THEN sc.quantity ELSE 0 END) AS trailer_comp
  FROM show_comps sc
  GROUP BY sc.show_id, sc.sku, sc.size
),
-- Combine all data
combined AS (
  SELECT
    spg.*,
    COALESCE(ps.projected_units, 0) AS projected_sales,
    COALESCE(acts.actual_units, 0) AS actual_sales,
    COALESCE(d.delivery_units, 0) AS deliveries,
    COALESCE(c.comp_units, 0) AS total_comps,
    COALESCE(c.band_comp, 0) AS band_comp,
    COALESCE(c.gms_comp, 0) AS gms_comp,
    COALESCE(c.show_comp, 0) AS show_comp,
    COALESCE(c.trailer_comp, 0) AS trailer_comp
  FROM show_product_grid spg
  LEFT JOIN projected_sales ps ON ps.show_id = spg.show_id
    AND ps.sku = spg.sku
    AND (ps.size = spg.size OR (ps.size IS NULL AND spg.size IS NULL))
  LEFT JOIN actual_sales acts ON acts.show_id = spg.show_id
    AND acts.sku = spg.sku
    AND (acts.size = spg.size OR (acts.size IS NULL AND spg.size IS NULL))
  LEFT JOIN deliveries d ON d.show_id = spg.show_id
    AND d.sku = spg.sku
    AND (d.size = spg.size OR (d.size IS NULL AND spg.size IS NULL))
  LEFT JOIN comps c ON c.show_id = spg.show_id
    AND c.sku = spg.sku
    AND (c.size = spg.size OR (c.size IS NULL AND spg.size IS NULL))
)
SELECT
  show_id,
  tour_id,
  show_date,
  city,
  venue_name,
  show_number,
  sku,
  size,
  projected_sales,
  actual_sales,
  deliveries,
  total_comps,
  band_comp,
  gms_comp,
  show_comp,
  trailer_comp,
  -- Running balance = cumulative deliveries - cumulative sales - cumulative comps
  -- (Initial inventory is added at query time since it's scenario-specific)
  SUM(deliveries - COALESCE(actual_sales, projected_sales) - total_comps)
    OVER (PARTITION BY tour_id, sku, size ORDER BY show_date, show_number
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_change,
  -- Per-show net change
  deliveries - COALESCE(actual_sales, projected_sales) - total_comps AS show_net_change
FROM combined
ORDER BY tour_id, sku, size, show_date, show_number;

-- ============================================================================
-- 6. REORDER_ALERTS VIEW
-- ============================================================================
-- Shows products that are below their reorder threshold at any upcoming show

CREATE OR REPLACE VIEW reorder_alerts AS
SELECT
  rt.tour_id,
  rt.sku,
  rt.size,
  rt.minimum_balance,
  rt.reorder_quantity,
  rt.lead_time_days,
  MIN(srb.show_date) AS first_stockout_date,
  MIN(srb.show_number) AS first_stockout_show,
  MIN(srb.cumulative_change) AS lowest_projected_balance
FROM reorder_thresholds rt
JOIN show_running_balances srb ON srb.tour_id = rt.tour_id
  AND srb.sku = rt.sku
  AND (srb.size = rt.size OR rt.size IS NULL)
JOIN initial_inventory ii ON ii.tour_id = rt.tour_id
  AND ii.sku = rt.sku
  AND (ii.size = srb.size OR (ii.size IS NULL AND srb.size IS NULL))
WHERE rt.is_active = true
  AND srb.show_date >= CURRENT_DATE
  AND (ii.quantity + srb.cumulative_change) < rt.minimum_balance
GROUP BY rt.tour_id, rt.sku, rt.size, rt.minimum_balance, rt.reorder_quantity, rt.lead_time_days;

-- ============================================================================
-- 7. DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE show_comps IS 'Tracks complimentary items given at each show, by category (band, gms, show, trailer)';
COMMENT ON COLUMN show_comps.comp_type IS 'Category of comp: band (artist/crew), gms (company), show (venue), trailer (production)';

COMMENT ON TABLE reorder_thresholds IS 'Configurable reorder alert thresholds per product per tour';
COMMENT ON COLUMN reorder_thresholds.minimum_balance IS 'Alert when projected balance falls below this level';
COMMENT ON COLUMN reorder_thresholds.reorder_quantity IS 'Suggested quantity to reorder when alert triggers';
COMMENT ON COLUMN reorder_thresholds.lead_time_days IS 'Expected days for fulfillment (used for alert timing)';

COMMENT ON TABLE initial_inventory IS 'Starting inventory (Stock B/F) at tour start, used as baseline for running balance calculation';

COMMENT ON TABLE show_deliveries IS 'Deliveries and returns received at each show';
COMMENT ON COLUMN show_deliveries.delivery_type IS 'delivery = stock added, return = stock sent back, adjustment = manual correction';

COMMENT ON VIEW show_running_balances IS 'Calculates running inventory balance per product/size across all shows chronologically';
COMMENT ON VIEW reorder_alerts IS 'Products projected to fall below reorder threshold at upcoming shows';
