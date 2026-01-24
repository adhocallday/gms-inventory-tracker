-- GMS Inventory Tracker Schema

create schema if not exists public;
set search_path = public;

create extension if not exists pgcrypto;

-- Core tables
create table if not exists public.tours (
  id uuid primary key,
  name text not null,
  artist text not null,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key,
  sku text not null unique,
  description text not null,
  product_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tour_products (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null,
  blank_unit_cost numeric(12, 2) not null default 0,
  print_unit_cost numeric(12, 2) not null default 0,
  full_package_cost numeric(12, 2) not null default 0,
  suggested_retail numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_products_unique unique (tour_id, product_id, size)
);

create table if not exists public.shows (
  id uuid primary key,
  tour_id uuid not null references public.tours(id) on delete cascade,
  show_date date not null,
  venue_name text not null,
  city text,
  state text,
  attendance integer,
  capacity integer,
  settlement_status text not null default 'unreconciled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shows_tour_date_venue_unique unique (tour_id, show_date, venue_name)
);

-- Staging table for parse -> review -> post workflow
create table if not exists public.parsed_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('po', 'packing-list', 'sales-report', 'settlement')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'posted', 'error')),
  source_hash text not null,
  source_filename text,
  tour_id uuid references public.tours(id) on delete set null,
  show_id uuid references public.shows(id) on delete set null,
  extracted_json jsonb,
  normalized_json jsonb,
  ui_overrides jsonb,
  validation jsonb,
  post_receipt jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parsed_documents_unique unique (doc_type, source_hash)
);

create index if not exists parsed_documents_status_idx
  on public.parsed_documents (status, doc_type);

create table if not exists public.purchase_orders (
  id uuid primary key,
  po_number text not null unique,
  tour_id uuid not null references public.tours(id) on delete cascade,
  vendor text not null,
  order_date date,
  expected_delivery date,
  status text not null default 'open',
  total_amount numeric(14, 2),
  source_doc_id uuid references public.parsed_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.po_line_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  tour_product_id uuid not null references public.tour_products(id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered >= 0),
  unit_cost numeric(12, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packing_lists (
  id uuid primary key,
  delivery_number text not null,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  received_date date,
  received_location text,
  received_by text,
  source_doc_id uuid references public.parsed_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packing_lists_po_delivery_unique unique (po_id, delivery_number)
);

create table if not exists public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists(id) on delete cascade,
  po_line_item_id uuid not null references public.po_line_items(id) on delete cascade,
  quantity_received integer not null check (quantity_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packing_list_items_unique unique (packing_list_id, po_line_item_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  tour_product_id uuid not null references public.tour_products(id) on delete restrict,
  qty_sold integer not null check (qty_sold >= 0),
  unit_price numeric(12, 2) not null default 0,
  gross_sales numeric(14, 2) not null default 0,
  source_doc_id uuid references public.parsed_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_show_tour_product_unique unique (show_id, tour_product_id)
);

create table if not exists public.comps (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  tour_product_id uuid not null references public.tour_products(id) on delete restrict,
  comp_type text not null,
  quantity integer not null check (quantity >= 0),
  source_doc_id uuid references public.parsed_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_processing_logs (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours(id) on delete set null,
  show_id uuid references public.shows(id) on delete set null,
  doc_type text,
  source_hash text,
  source_filename text,
  parsed_json jsonb,
  status text not null default 'ok',
  error_message text,
  created_at timestamptz not null default now()
);

-- Inventory balances (materialized view)
create materialized view if not exists public.inventory_balances as
with received as (
  select
    tp.tour_id,
    tp.product_id,
    tp.size,
    coalesce(sum(pli.quantity_received), 0) as total_received
  from public.tour_products tp
  left join public.po_line_items poli on poli.tour_product_id = tp.id
  left join public.packing_list_items pli on pli.po_line_item_id = poli.id
  group by tp.tour_id, tp.product_id, tp.size
),
sold as (
  select
    tp.tour_id,
    tp.product_id,
    tp.size,
    coalesce(sum(s.qty_sold), 0) as total_sold
  from public.sales s
  join public.tour_products tp on tp.id = s.tour_product_id
  group by tp.tour_id, tp.product_id, tp.size
),
comped as (
  select
    tp.tour_id,
    tp.product_id,
    tp.size,
    coalesce(sum(c.quantity), 0) as total_comps
  from public.comps c
  join public.tour_products tp on tp.id = c.tour_product_id
  group by tp.tour_id, tp.product_id, tp.size
)
select
  coalesce(r.tour_id, so.tour_id, co.tour_id) as tour_id,
  coalesce(r.product_id, so.product_id, co.product_id) as product_id,
  coalesce(r.size, so.size, co.size) as size,
  coalesce(r.total_received, 0) as total_received,
  coalesce(so.total_sold, 0) as total_sold,
  coalesce(co.total_comps, 0) as total_comps,
  (coalesce(r.total_received, 0) - coalesce(so.total_sold, 0) - coalesce(co.total_comps, 0)) as balance
from received r
full join sold so
  on so.tour_id = r.tour_id and so.product_id = r.product_id and so.size = r.size
full join comped co
  on co.tour_id = coalesce(r.tour_id, so.tour_id)
 and co.product_id = coalesce(r.product_id, so.product_id)
 and co.size = coalesce(r.size, so.size);

create index if not exists inventory_balances_lookup
  on public.inventory_balances (tour_id, product_id, size);

-- Dashboard views
create or replace view public.show_sales_per_head as
select
  s.id as show_id,
  s.tour_id,
  s.show_date,
  s.venue_name,
  s.city,
  s.state,
  sum(sa.gross_sales) as total_gross,
  s.attendance,
  round(sum(sa.gross_sales) / nullif(s.attendance, 0), 2) as per_head
from public.shows s
left join public.sales sa on sa.show_id = s.id
group by s.id, s.tour_id, s.show_date, s.venue_name, s.city, s.state, s.attendance;

create or replace view public.product_sales_summary as
select
  p.id as product_id,
  p.sku,
  p.description,
  tp.size,
  sum(sa.qty_sold) as total_sold,
  sum(sa.gross_sales) as total_gross,
  count(distinct sa.show_id) as shows_sold_at
from public.products p
join public.tour_products tp on tp.product_id = p.id
left join public.sales sa on sa.tour_product_id = tp.id
group by p.id, p.sku, p.description, tp.size;

create or replace view public.cogs_summary as
select
  tp.tour_id,
  tp.product_id,
  tp.size,
  sum(sa.qty_sold) as total_sold,
  sum(sa.gross_sales) as total_gross,
  tp.full_package_cost,
  (sum(sa.qty_sold) * tp.full_package_cost) as total_cogs,
  (sum(sa.gross_sales) - (sum(sa.qty_sold) * tp.full_package_cost)) as gross_margin
from public.tour_products tp
left join public.sales sa on sa.tour_product_id = tp.id
group by tp.tour_id, tp.product_id, tp.size, tp.full_package_cost;

-- Forecasting & design assets
create table if not exists public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  name text not null,
  is_baseline boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forecast_overrides (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.forecast_scenarios(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete cascade,
  show_id uuid references public.shows(id) on delete set null,
  sku text not null,
  size text,
  override_units integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists forecast_overrides_lookup
  on public.forecast_overrides (scenario_id, tour_id, sku);

create table if not exists public.design_assets (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  storage_path text not null,
  asset_type text not null default 'mockup',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists design_assets_tour_idx
  on public.design_assets (tour_id);

-- Tracker-style views
create or replace view public.product_summary as
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

create or replace view public.show_summary as
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

create or replace view public.stock_movement as
select
  po.tour_id,
  pl.received_date,
  pl.delivery_number,
  p.sku,
  tp.size,
  pli.quantity_received
from public.packing_list_items pli
join public.packing_lists pl on pl.id = pli.packing_list_id
join public.po_line_items poli on poli.id = pli.po_line_item_id
join public.purchase_orders po on po.id = poli.po_id
join public.tour_products tp on tp.id = poli.tour_product_id
join public.products p on p.id = tp.product_id;
