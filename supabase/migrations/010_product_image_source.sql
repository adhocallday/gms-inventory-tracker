-- Migration 010: where a product image came from
--
-- Grab-sheet image recognition (/admin/products/grab-sheet) records how each
-- image was found, so a wrong attachment can be traced and re-reviewed.
-- Not applied automatically: run after a backup. Until it runs, approving on
-- the review screen stops with "Run migration 010 first".

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS source_page INTEGER,
  ADD COLUMN IF NOT EXISTS bbox JSONB,
  ADD COLUMN IF NOT EXISTS sku_read TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3);

-- Existing rows were all uploaded by hand.
UPDATE product_images SET source = 'manual' WHERE source IS NULL;
ALTER TABLE product_images ALTER COLUMN source SET DEFAULT 'manual';
ALTER TABLE product_images ALTER COLUMN source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_images_source_check') THEN
    ALTER TABLE product_images
      ADD CONSTRAINT product_images_source_check CHECK (source IN ('grab_sheet', 'manual', 'pop'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_images_confidence_check') THEN
    ALTER TABLE product_images
      ADD CONSTRAINT product_images_confidence_check CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
  END IF;
END $$;

-- One primary image per product. Demote extra primaries first (keep the newest).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id) AS rn
  FROM product_images
  WHERE is_primary = true AND product_id IS NOT NULL
)
UPDATE product_images p SET is_primary = false
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary
  ON product_images (product_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_product_images_source ON product_images (source);

-- Writes go through server routes with the service role only.
-- (The service role bypasses RLS; these drops remove anon/authenticated writes.)
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON product_images;
-- "Anyone can view product images" (SELECT) stays.

COMMENT ON COLUMN product_images.source IS 'grab_sheet | manual | pop';
COMMENT ON COLUMN product_images.bbox IS 'Grab sheet: {image:{x,y,w,h}, caption:{x,y,w,h}} normalised 0-1 on the source page';
COMMENT ON COLUMN product_images.sku_read IS 'SKU read back from the crop (Haiku) when the image was approved';
COMMENT ON COLUMN product_images.confidence IS 'Detection confidence 0-1 when the image was approved';
