-- Auto-generated seed from 01 GHOST 2025 TOUR.xlsx
begin;
-- Upsert products
insert into public.products (id, sku, description, product_type)
values
  (gen_random_uuid(), 'GHOSRX203729BK', 'BLACK T SKELETOUR 2025 ITIN', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203728BK', 'BLACK T SKELETA ALBUM COVER 2025 ITIN', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203730BK', 'BLACK T WESTERN EMERITUS 2025 ITIN', 'apparel'),
  (gen_random_uuid(), 'GHOSRX103726BK', 'BLACK TANK OPUS EPONYMOUS', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203400BK', 'LADIES CROP TOP SHOWGHOULS', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203727PK', 'LADIES PINK RAGLAN GARGOYLE', 'apparel'),
  (gen_random_uuid(), 'GHOSNS903311BK', 'BATWING HOODY', 'apparel'),
  (gen_random_uuid(), 'GHOSNS503396BK', 'BATWING ZIP HOODIE', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203401BK', 'PULLOVER HOODY SKELETON', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203275BK', 'SHORTS BLACK/ WHT PAPA V COSTUME CLAWS', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203275B', 'RUNNING SHORTS (BLACK)', 'apparel'),
  (gen_random_uuid(), 'GHOSRX103510OT', 'TIE DYE T TOP HAT', 'apparel'),
  (gen_random_uuid(), 'GHOSRX103437OT', 'CRYSTAL WASHED T AT THE GATES', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203738BL', 'OILWASHED NAVY BLUE T COME TOGETHER', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203570RD', 'SHORTS RED/WHITE LOGO', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203800BK', 'EVENT T TAMPA', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203799BK', 'EVENT T PHILLY', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203798BK', 'EVENT T BOSTON', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203801BK', 'EVENT T NEW YORK', 'apparel'),
  (gen_random_uuid(), 'GHOSRX203822BK', 'EVENT T CHICAGO', 'apparel'),
  (gen_random_uuid(), 'GHOSNS103665BK', 'HAT SATANIC PANIC', 'other'),
  (gen_random_uuid(), 'GHOSNS903309GR', 'MASK BURNT GHOUL', 'other'),
  (gen_random_uuid(), 'GHOSNS903279OT', 'PLUSHIE FRATER IMPERATOR', 'other'),
  (gen_random_uuid(), 'GHOSRX103259OT', 'CLEAR SLING BAG-SILVER LOGO', 'other'),
  (gen_random_uuid(), 'GHOSRX103241BK', 'CHOKER PAPA V', 'other'),
  (gen_random_uuid(), 'GHOSRX203254GR', 'KEYCHAIN SKELETON GRUCIFIX', 'other'),
  (gen_random_uuid(), 'GHOSRX903403OT', 'PATCH SET OF 3', 'other'),
  (gen_random_uuid(), 'GHOSNS103814BK', 'TOUR PROGRAM', 'media'),
  (gen_random_uuid(), 'GHOSRX903408OT', 'LP SKELETA POLTERGEIST', 'media'),
  (gen_random_uuid(), 'GHOSNS203369OT', 'FOILED COMIC BOOK SISTER IMPERATOR # 1', 'media'),
  (gen_random_uuid(), 'GHOSNS203533OT', 'COMIC BOOK SISTER IMPERATOR #2', 'media'),
  (gen_random_uuid(), 'GHOSNS203534OT', 'COMIC BOOK SISTER IMPERATOR #3', 'media'),
  (gen_random_uuid(), 'GHOSNS203535OT', 'COMIC BOOK SISTER IMPERATOR #4', 'media'),
  (gen_random_uuid(), 'GHOSNS103619OT', 'FOILED COMIC BOOK SISTER IMPERATOR #2', 'media'),
  (gen_random_uuid(), 'GHOSNS103622OT', 'FOILED COMIC BOOK SISTER IMPERATOR #3', 'media'),
  (gen_random_uuid(), 'GHOSNS103624OT', 'FOILED COMIC BOOK SISTER IMPERATOR #4', 'media'),
  (gen_random_uuid(), 'GHOSRX003463OT', 'CD SKELETA', 'media'),
  (gen_random_uuid(), 'GHOSRX003470OT', 'ROLLING STONE MAG & ALBUM', 'media'),
  (gen_random_uuid(), 'GHOSRX003611BK', 'LP SKELETA BLACK VINYL', 'media'),
  (gen_random_uuid(), 'GHOSCG103805PU', 'LP PURPLE LENTICULAR', 'media'),
  (gen_random_uuid(), 'GHOSCG103844BK', 'CASSETTE', 'media')

on conflict (sku) do update set description = excluded.description, product_type = excluded.product_type;

-- Upsert tour_products with sizes
insert into public.tour_products (tour_id, product_id, size, blank_unit_cost, print_unit_cost, full_package_cost, suggested_retail)
select
  '123e4567-e89b-12d3-a456-426614174000'::uuid as tour_id,
  p.id as product_id,
  s.size,
  i.blank_unit_cost,
  i.print_unit_cost,
  i.full_package_cost,
  nullif(i.suggested_retail, 0)
from (
  select * from (values
    ('GHOSRX203729BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX203728BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX203730BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX103726BK', 0.00, 0.00, 7.38, 0.00, 'apparel'),
    ('GHOSRX203400BK', 0.00, 0.00, 9.77, 0.00, 'apparel'),
    ('GHOSRX203727PK', 0.00, 0.00, 12.29, 0.00, 'apparel'),
    ('GHOSNS903311BK', 0.00, 0.00, 28.50, 0.00, 'apparel'),
    ('GHOSNS503396BK', 0.00, 0.00, 28.50, 0.00, 'apparel'),
    ('GHOSRX203401BK', 0.00, 0.00, 14.19, 0.00, 'apparel'),
    ('GHOSRX203275BK', 5.50, 0.00, 0.00, 0.00, 'apparel'),
    ('GHOSRX203275B', 5.50, 0.00, 0.00, 0.00, 'apparel'),
    ('GHOSRX103510OT', 0.00, 0.00, 12.15, 0.00, 'apparel'),
    ('GHOSRX103437OT', 0.00, 0.00, 8.71, 0.00, 'apparel'),
    ('GHOSRX203738BL', 0.00, 0.00, 11.15, 0.00, 'apparel'),
    ('GHOSRX203570RD', 0.00, 0.00, 12.19, 0.00, 'apparel'),
    ('GHOSRX203800BK', 0.00, 0.00, 6.20, 0.00, 'apparel'),
    ('GHOSRX203799BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX203798BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX203801BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSRX203822BK', 0.00, 0.00, 5.70, 0.00, 'apparel'),
    ('GHOSNS103665BK', 3.92, 0.00, 0.00, 0.00, 'other'),
    ('GHOSNS903309GR', 4.80, 0.00, 0.00, 0.00, 'other'),
    ('GHOSNS903279OT', 8.90, 0.00, 0.00, 0.00, 'other'),
    ('GHOSRX103259OT', 3.80, 0.00, 0.00, 0.00, 'other'),
    ('GHOSRX103241BK', 3.60, 0.00, 0.00, 0.00, 'other'),
    ('GHOSRX203254GR', 1.50, 0.00, 0.00, 0.00, 'other'),
    ('GHOSRX903403OT', 2.05, 0.00, 0.00, 0.00, 'other'),
    ('GHOSNS103814BK', 5.59, 0.00, 0.00, 0.00, 'media'),
    ('GHOSRX903408OT', 16.89, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS203369OT', 4.25, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS203533OT', 2.00, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS203534OT', 2.00, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS203535OT', 2.00, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS103619OT', 4.05, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS103622OT', 4.05, 0.00, 0.00, 0.00, 'media'),
    ('GHOSNS103624OT', 4.05, 0.00, 0.00, 0.00, 'media'),
    ('GHOSRX003463OT', 12.25, 0.00, 0.00, 0.00, 'media'),
    ('GHOSRX003470OT', 11.59, 0.00, 0.00, 0.00, 'media'),
    ('GHOSRX003611BK', 24.10, 0.00, 0.00, 0.00, 'media'),
    ('GHOSCG103805PU', 0.00, 0.00, 0.00, 0.00, 'media'),
    ('GHOSCG103844BK', 0.00, 0.00, 0.00, 0.00, 'media')
  ) as t(sku, blank_unit_cost, print_unit_cost, full_package_cost, suggested_retail, product_type)
) as i
join public.products p on p.sku = i.sku
join lateral (
  select unnest(case when i.product_type = 'apparel' then array['S','M','L','XL','2XL','3XL'] else array['OS'] end) as size
) s on true
on conflict (tour_id, product_id, size) do update set
  blank_unit_cost = excluded.blank_unit_cost,
  print_unit_cost = excluded.print_unit_cost,
  full_package_cost = excluded.full_package_cost,
  suggested_retail = excluded.suggested_retail,
  updated_at = now();

-- Insert shows from Tour Dates (avoid duplicates)
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-09', 'CFG Bank Arena', 'Baltimore', 'MD', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-09' and venue_name = 'CFG Bank Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-11', 'State Farm Arena', 'Atlanta', 'GA', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-11' and venue_name = 'State Farm Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-12', 'Amalie Arena', 'Tampa', 'FL', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-12' and venue_name = 'Amalie Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-13', 'Kaseya Center', 'Miami', 'FL', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-13' and venue_name = 'Kaseya Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-15', 'Lenovo Center', 'Raleigh', 'NC', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-15' and venue_name = 'Lenovo Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-17', 'Rocket Mortgage FieldHouse', 'Cleveland', 'OH', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-17' and venue_name = 'Rocket Mortgage FieldHouse');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-18', 'PPG Paints Arena', 'Pittsburgh', 'PA', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-18' and venue_name = 'PPG Paints Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-19', 'Wells Fargo Center', 'Philadelphia', 'PA', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-19' and venue_name = 'Wells Fargo Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-21', 'TD Garden', 'Boston', 'MA', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-21' and venue_name = 'TD Garden');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-22', 'Madison Square Garden', 'New York', 'NY', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-22' and venue_name = 'Madison Square Garden');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-24', 'Little Caesars Arena', 'Detroit', 'MI', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-24' and venue_name = 'Little Caesars Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-25', 'KFC Yum! Center', 'Louisville', 'KY', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-25' and venue_name = 'KFC Yum! Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-26', 'Bridgestone Arena', 'Nashville', 'TN', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-26' and venue_name = 'Bridgestone Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-28', 'Van Andel Arena', 'Grand Rapids', 'MI', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-28' and venue_name = 'Van Andel Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-29', 'Fiserv Forum', 'Milwaukee', 'WI', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-29' and venue_name = 'Fiserv Forum');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-07-30', 'Enterprise Center', 'St. Louis', 'MO', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-07-30' and venue_name = 'Enterprise Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-01', 'Allstate Arena', 'Rosemont', 'IL', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-01' and venue_name = 'Allstate Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-02', 'Xcel Energy Center', 'Saint Paul', 'MN', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-02' and venue_name = 'Xcel Energy Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-03', 'CHI Health Center', 'Omaha', 'NE', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-03' and venue_name = 'CHI Health Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-05', 'T-Mobile Center', 'Kansas City', 'MO', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-05' and venue_name = 'T-Mobile Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-07', 'Ball Arena', 'Denver', 'CO', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-07' and venue_name = 'Ball Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-09', 'MGM Grand Garden Arena', 'Las Vegas', 'NV', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-09' and venue_name = 'MGM Grand Garden Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-10', 'Viejas Arena', 'San Diego', 'CA', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-10' and venue_name = 'Viejas Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-11', 'Footprint Center', 'Phoenix', 'AZ', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-11' and venue_name = 'Footprint Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-14', 'Moody Center', 'Austin', 'TX', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-14' and venue_name = 'Moody Center');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-15', 'Dickies Arena', 'Fort Worth', 'TX', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-15' and venue_name = 'Dickies Arena');
insert into public.shows (id, tour_id, show_date, venue_name, city, state, settlement_status) select gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', '2025-08-16', 'Toyota Center', 'Houston', 'TX', 'unreconciled' where not exists (  select 1 from public.shows where tour_id = '123e4567-e89b-12d3-a456-426614174000' and show_date = '2025-08-16' and venue_name = 'Toyota Center');
commit;