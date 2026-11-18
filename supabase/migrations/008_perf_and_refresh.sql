-- 008: indexes for the core lookup paths, and a way to refresh inventory_balances.
--
-- inventory_balances is a materialized view, so it only changes when refreshed.
-- Posting a document calls refresh_inventory_balances() so balances stay current.

-- Foreign-key lookups used by dashboards, show pages and posting
create index if not exists idx_sales_tour_product on public.sales (tour_product_id);
create index if not exists idx_comps_show on public.comps (show_id);
create index if not exists idx_comps_tour_product on public.comps (tour_product_id);
create index if not exists idx_shows_tour_date on public.shows (tour_id, show_date);
create index if not exists idx_po_line_items_po on public.po_line_items (po_id, tour_product_id);
create index if not exists idx_po_line_items_tour_product on public.po_line_items (tour_product_id);
create index if not exists idx_packing_list_items_po_line on public.packing_list_items (po_line_item_id);
create index if not exists idx_packing_lists_po on public.packing_lists (po_id);
create index if not exists idx_purchase_orders_tour on public.purchase_orders (tour_id);

-- Refresh the balances view. Only the service role may call it.
create or replace function public.refresh_inventory_balances()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view public.inventory_balances;
$$;

revoke all on function public.refresh_inventory_balances() from public, anon, authenticated;
grant execute on function public.refresh_inventory_balances() to service_role;

-- Bring balances current now
select public.refresh_inventory_balances();
