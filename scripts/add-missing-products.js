#!/usr/bin/env node

const { Client } = require('pg');

async function addMissingProducts() {
  // Use Session Pooler for remote connection
  const connectionString = 'postgresql://postgres.mtfmckqbpykxblgpgnpo:gms_tour_2026@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database via Session Pooler');

    // Add missing products
    const productSql = `
      insert into public.products (id, sku, description, product_type)
      values
        (gen_random_uuid(), 'GHOSNS503396BK', 'BATWING ZIP HOODIE', 'apparel'),
        (gen_random_uuid(), 'GHOSRX203275B', 'RUNNING SHORTS (BLACK)', 'apparel')
      on conflict (sku) do update set description = excluded.description, product_type = excluded.product_type;
    `;

    await client.query(productSql);
    console.log('✅ Added missing products');

    // Add tour_products entries for Ghost tour
    const tourProductsSql = `
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
          ('GHOSNS503396BK', 0.00, 0.00, 28.50, 0.00, 'apparel'),
          ('GHOSRX203275B', 5.50, 0.00, 0.00, 0.00, 'apparel')
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
        suggested_retail = excluded.suggested_retail;
    `;

    await client.query(tourProductsSql);
    console.log('✅ Added tour_products entries');

    // Verify products exist
    const { rows } = await client.query(`
      select sku, description from products
      where sku in ('GHOSNS503396BK', 'GHOSRX203275B')
      order by sku
    `);

    console.log('\nVerified products:');
    rows.forEach(row => console.log(`  ${row.sku} - ${row.description}`));

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addMissingProducts().catch(console.error);
