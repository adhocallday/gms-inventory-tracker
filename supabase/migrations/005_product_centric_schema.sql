-- Migration: Product-Centric Re-Architecture
-- Creates tables for warehouse locations, product allocations, show projections, and stock movements
-- This fixes the fundamental architecture error where tabs were thought to be cities but are actually products

-- ============================================================================
-- 1. WAREHOUSE_LOCATIONS
-- ============================================================================
-- Stores physical/logical stock locations (Road, Warehouse, Web, custom hubs)

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('standard', 'custom')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_warehouse_per_tour UNIQUE(tour_id, name)
);

-- Indexes
CREATE INDEX idx_warehouse_locations_tour ON warehouse_locations(tour_id);
CREATE INDEX idx_warehouse_locations_active ON warehouse_locations(tour_id, is_active);

-- RLS Policies
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouse locations"
  ON warehouse_locations FOR SELECT
  USING (true);

CREATE POLICY "Users can insert warehouse locations"
  ON warehouse_locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update warehouse locations"
  ON warehouse_locations FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete warehouse locations"
  ON warehouse_locations FOR DELETE
  USING (true);

-- Seed standard/template locations for all existing tours
-- These are active by default but fully editable (names can be changed, can be deactivated)
-- Users can rename "Road" to "Tour Truck", "Warehouse" to "Nashville Hub", etc.
INSERT INTO warehouse_locations (tour_id, name, location_type, is_active, display_order)
SELECT
  t.id,
  loc.name,
  'standard',
  true,
  loc.display_order
FROM tours t
CROSS JOIN (VALUES
  ('Road', 1),
  ('Warehouse', 2),
  ('Web', 3)
) AS loc(name, display_order)
ON CONFLICT (tour_id, name) DO NOTHING;

-- Note: Standard locations serve as templates/suggestions
-- Tours can rename them, deactivate them, or add custom locations as needed
-- Example custom locations: "Chicago Hub", "Tour Truck", "Nashville Warehouse", "Merch Table Stock"

-- ============================================================================
-- 2. PRODUCT_WAREHOUSE_ALLOCATIONS
-- ============================================================================
-- Stores how many units of each product are allocated to each warehouse location

CREATE TABLE IF NOT EXISTS product_warehouse_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  warehouse_location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  size VARCHAR(10), -- NULL for SKU-level allocation, or 'S', 'M', 'L', 'XL', '2XL', '3XL'
  allocated_units INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_allocation_per_scenario_sku_warehouse_size
    UNIQUE(scenario_id, tour_id, sku, warehouse_location_id, size)
);

-- Indexes
CREATE INDEX idx_warehouse_allocations_scenario ON product_warehouse_allocations(scenario_id);
CREATE INDEX idx_warehouse_allocations_tour ON product_warehouse_allocations(tour_id);
CREATE INDEX idx_warehouse_allocations_sku ON product_warehouse_allocations(sku);
CREATE INDEX idx_warehouse_allocations_warehouse ON product_warehouse_allocations(warehouse_location_id);

-- RLS Policies
ALTER TABLE product_warehouse_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warehouse allocations"
  ON product_warehouse_allocations FOR SELECT
  USING (true);

CREATE POLICY "Users can insert warehouse allocations"
  ON product_warehouse_allocations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update warehouse allocations"
  ON product_warehouse_allocations FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete warehouse allocations"
  ON product_warehouse_allocations FOR DELETE
  USING (true);

-- ============================================================================
-- 3. PRODUCT_SHOW_PROJECTIONS
-- ============================================================================
-- Stores projected sales for each product at each show

CREATE TABLE IF NOT EXISTS product_show_projections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  size VARCHAR(10), -- NULL for SKU-level projection, or 'S', 'M', 'L', 'XL', '2XL', '3XL'
  projected_units INTEGER NOT NULL DEFAULT 0,
  projected_gross NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_projection_per_scenario_show_sku_size
    UNIQUE(scenario_id, show_id, sku, size)
);

-- Indexes
CREATE INDEX idx_show_projections_scenario ON product_show_projections(scenario_id);
CREATE INDEX idx_show_projections_tour ON product_show_projections(tour_id);
CREATE INDEX idx_show_projections_show ON product_show_projections(show_id);
CREATE INDEX idx_show_projections_sku ON product_show_projections(sku);

-- RLS Policies
ALTER TABLE product_show_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view show projections"
  ON product_show_projections FOR SELECT
  USING (true);

CREATE POLICY "Users can insert show projections"
  ON product_show_projections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update show projections"
  ON product_show_projections FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete show projections"
  ON product_show_projections FOR DELETE
  USING (true);

-- ============================================================================
-- 4. PRODUCT_STOCK_MOVEMENTS
-- ============================================================================
-- Tracks actual stock movements (sales, deliveries, transfers, adjustments)

CREATE TABLE IF NOT EXISTS product_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  show_id UUID REFERENCES shows(id) ON DELETE SET NULL, -- NULL for non-show movements
  movement_date DATE NOT NULL,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('sale', 'delivery', 'transfer', 'adjustment', 'return')),
  from_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  size VARCHAR(10), -- NULL for SKU-level movement, or 'S', 'M', 'L', 'XL', '2XL', '3XL'
  units INTEGER NOT NULL,
  gross_amount NUMERIC(10,2),
  channel VARCHAR(50), -- 'gross', 'vips', 'cc', 'cash', etc.
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stock_movements_tour ON product_stock_movements(tour_id);
CREATE INDEX idx_stock_movements_sku ON product_stock_movements(sku);
CREATE INDEX idx_stock_movements_show ON product_stock_movements(show_id);
CREATE INDEX idx_stock_movements_date ON product_stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON product_stock_movements(movement_type);
CREATE INDEX idx_stock_movements_from_location ON product_stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location ON product_stock_movements(to_location_id);

-- RLS Policies
ALTER TABLE product_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock movements"
  ON product_stock_movements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert stock movements"
  ON product_stock_movements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update stock movements"
  ON product_stock_movements FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete stock movements"
  ON product_stock_movements FOR DELETE
  USING (true);

-- ============================================================================
-- 5. UTILITY VIEWS
-- ============================================================================

-- View: Current stock balance per product/size/warehouse
CREATE OR REPLACE VIEW product_stock_balances AS
SELECT
  psm.tour_id,
  psm.sku,
  psm.size,
  COALESCE(psm.from_location_id, psm.to_location_id) AS warehouse_location_id,
  wl.name AS warehouse_name,
  SUM(
    CASE
      WHEN psm.movement_type IN ('delivery', 'transfer') AND psm.to_location_id IS NOT NULL
        THEN psm.units
      WHEN psm.movement_type IN ('sale', 'transfer') AND psm.from_location_id IS NOT NULL
        THEN -psm.units
      WHEN psm.movement_type = 'adjustment'
        THEN psm.units
      ELSE 0
    END
  ) AS current_balance
FROM product_stock_movements psm
LEFT JOIN warehouse_locations wl ON wl.id = COALESCE(psm.from_location_id, psm.to_location_id)
GROUP BY psm.tour_id, psm.sku, psm.size, COALESCE(psm.from_location_id, psm.to_location_id), wl.name;

-- View: Product sales summary by show
CREATE OR REPLACE VIEW product_show_sales AS
SELECT
  psm.tour_id,
  psm.show_id,
  s.show_date,
  s.venue_name,
  s.city,
  psm.sku,
  psm.size,
  SUM(CASE WHEN psm.movement_type = 'sale' THEN psm.units ELSE 0 END) AS units_sold,
  SUM(CASE WHEN psm.movement_type = 'sale' THEN psm.gross_amount ELSE 0 END) AS gross_sales,
  SUM(CASE WHEN psm.movement_type = 'sale' AND psm.channel = 'vips' THEN psm.units ELSE 0 END) AS vip_units,
  SUM(CASE WHEN psm.movement_type = 'sale' AND psm.channel = 'cc' THEN psm.units ELSE 0 END) AS cc_units,
  SUM(CASE WHEN psm.movement_type = 'sale' AND psm.channel = 'cash' THEN psm.units ELSE 0 END) AS cash_units
FROM product_stock_movements psm
LEFT JOIN shows s ON s.id = psm.show_id
WHERE psm.movement_type = 'sale'
GROUP BY psm.tour_id, psm.show_id, s.show_date, s.venue_name, s.city, psm.sku, psm.size;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE warehouse_locations IS 'Physical/logical stock locations (Road, Warehouse, Web, custom hubs). Standard locations are seeded automatically for all tours.';
COMMENT ON TABLE product_warehouse_allocations IS 'Pre-tour allocation of product units across warehouse locations. This replaces the old "bucket" system.';
COMMENT ON TABLE product_show_projections IS 'Projected sales for each product at each show. Used for planning and comparison against actuals.';
COMMENT ON TABLE product_stock_movements IS 'Actual stock movements (sales, deliveries, transfers). This replicates the Excel product tab structure.';

COMMENT ON COLUMN warehouse_locations.location_type IS 'standard = Road/Warehouse/Web/etc (cannot be deleted), custom = user-created locations';
COMMENT ON COLUMN product_warehouse_allocations.size IS 'NULL = SKU-level allocation, otherwise specific size (S/M/L/XL/2XL/3XL)';
COMMENT ON COLUMN product_show_projections.size IS 'NULL = SKU-level projection, otherwise specific size (S/M/L/XL/2XL/3XL)';
COMMENT ON COLUMN product_stock_movements.movement_type IS 'sale = sold to customer, delivery = received from vendor, transfer = moved between locations, adjustment = manual correction, return = returned by customer';
COMMENT ON COLUMN product_stock_movements.channel IS 'For sales: gross/vips/cc/cash. For other movement types: can be NULL or descriptive text.';
