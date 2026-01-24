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
