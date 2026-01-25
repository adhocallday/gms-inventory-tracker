-- Fix tour_reports_summary view to include section_count
DROP VIEW IF EXISTS tour_reports_summary;

CREATE VIEW tour_reports_summary AS
SELECT
  tr.*,
  t.name AS tour_name,
  t.start_date AS tour_start_date,
  t.end_date AS tour_end_date,
  (SELECT COUNT(*) FROM shows s WHERE s.tour_id = t.id) AS show_count,
  COALESCE(jsonb_array_length(tr.config->'sections'), 0) AS section_count
FROM tour_reports tr
LEFT JOIN tours t ON tr.tour_id = t.id;
