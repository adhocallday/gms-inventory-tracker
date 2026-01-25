-- Migration 006: Product Images and Reporting System
-- Add product image management and tour report generation capabilities

-- ============================================================================
-- PRODUCT IMAGES TABLE
-- ============================================================================
-- Stores product mockups/grab sheets used for reporting and display

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,

  -- Image metadata
  image_type VARCHAR(50) NOT NULL, -- 'grab_sheet', 'mockup', 'lifestyle', 'detail'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Display properties
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,

  -- Dimensions
  width INTEGER,
  height INTEGER,

  -- Upload info
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_tour ON product_images(tour_id);
CREATE INDEX idx_product_images_type ON product_images(image_type);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

-- RLS Policies
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload product images"
  ON product_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
  ON product_images FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
  ON product_images FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- TOUR REPORTS TABLE
-- ============================================================================
-- Stores generated PDF reports and metadata

CREATE TABLE IF NOT EXISTS tour_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,

  -- Report metadata
  report_type VARCHAR(50) NOT NULL, -- 'post_tour_breakdown', 'sales_analysis', 'inventory_summary'
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Report configuration (JSON)
  config JSONB DEFAULT '{}',

  -- Generated output
  pdf_url TEXT,
  page_count INTEGER,
  file_size INTEGER,

  -- Generation status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,

  -- Date range
  report_start_date DATE,
  report_end_date DATE,

  -- Generation info
  generated_by UUID,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tour_reports_tour ON tour_reports(tour_id);
CREATE INDEX idx_tour_reports_type ON tour_reports(report_type);
CREATE INDEX idx_tour_reports_status ON tour_reports(status);
CREATE INDEX idx_tour_reports_created ON tour_reports(created_at DESC);

-- RLS Policies
ALTER TABLE tour_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tour reports"
  ON tour_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tour reports"
  ON tour_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tour reports"
  ON tour_reports FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tour reports"
  ON tour_reports FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- REPORT SECTIONS TABLE
-- ============================================================================
-- Stores individual sections of reports for customization

CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,

  -- Section metadata
  section_type VARCHAR(50) NOT NULL, -- 'cover', 'product_breakdown', 'sales_chart', 'analytics'
  title VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,

  -- Section configuration
  config JSONB DEFAULT '{}',

  -- Visibility
  is_enabled BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_report_sections_tour ON report_sections(tour_id);
CREATE INDEX idx_report_sections_type ON report_sections(section_type);
CREATE INDEX idx_report_sections_order ON report_sections(display_order);

-- RLS Policies
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view report sections"
  ON report_sections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage report sections"
  ON report_sections FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- PRODUCT CATEGORIES TABLE
-- ============================================================================
-- Organize products into categories for reporting

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,

  -- Category info
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,

  -- Display properties
  display_order INTEGER DEFAULT 0,
  color VARCHAR(7), -- Hex color for charts
  icon TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tour_id, slug)
);

-- Index for fast lookups
CREATE INDEX idx_product_categories_tour ON product_categories(tour_id);
CREATE INDEX idx_product_categories_slug ON product_categories(slug);

-- RLS Policies
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product categories"
  ON product_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage product categories"
  ON product_categories FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Add category_id to products table
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- View: Product images with product details
CREATE OR REPLACE VIEW product_images_detail AS
SELECT
  pi.*,
  p.sku,
  p.description AS product_description,
  p.category_id,
  pc.name AS category_name,
  t.name AS tour_name
FROM product_images pi
LEFT JOIN products p ON pi.product_id = p.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN tours t ON pi.tour_id = t.id;

-- View: Tour reports with summary
CREATE OR REPLACE VIEW tour_reports_summary AS
SELECT
  tr.*,
  t.name AS tour_name,
  t.start_date AS tour_start_date,
  t.end_date AS tour_end_date,
  COUNT(DISTINCT s.id) AS show_count
FROM tour_reports tr
LEFT JOIN tours t ON tr.tour_id = t.id
LEFT JOIN shows s ON t.id = s.tour_id
GROUP BY tr.id, t.id;

-- ============================================================================
-- Seed default product categories for tours
-- ============================================================================

-- Insert standard categories for existing tours
INSERT INTO product_categories (tour_id, name, slug, display_order, color)
SELECT
  t.id,
  category.name,
  category.slug,
  category.display_order,
  category.color
FROM tours t
CROSS JOIN (VALUES
  ('Apparel', 'apparel', 1, '#3B82F6'),
  ('Event Tees', 'event-tees', 2, '#8B5CF6'),
  ('Accessories', 'accessories', 3, '#10B981'),
  ('Paper Items', 'paper-items', 4, '#F59E0B'),
  ('Media', 'media', 5, '#EF4444'),
  ('Sell-Off Items', 'sell-off', 6, '#6B7280')
) AS category(name, slug, display_order, color)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE product_images IS 'Product mockups and grab sheets for reporting and display';
COMMENT ON TABLE tour_reports IS 'Generated PDF reports for tours';
COMMENT ON TABLE report_sections IS 'Customizable sections within tour reports';
COMMENT ON TABLE product_categories IS 'Product categorization for reporting and organization';
