#!/usr/bin/env node

const { Client } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function fixView() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('\nFixing show_summary_view to prevent Cartesian product...');

    const sql = `
create or replace view public.show_summary_view as
select
  s.id as show_id,
  s.tour_id,
  s.show_date,
  s.venue_name,
  s.city,
  s.state,
  coalesce(sales_agg.total_gross, 0) as total_gross,
  s.attendance,
  round(coalesce(sales_agg.total_gross, 0) / nullif(s.attendance, 0), 2) as per_head,
  coalesce(comps_agg.total_comps, 0) as total_comps
from public.shows s
left join (
  select show_id, sum(gross_sales) as total_gross
  from public.sales
  group by show_id
) sales_agg on sales_agg.show_id = s.id
left join (
  select show_id, sum(quantity) as total_comps
  from public.comps
  group by show_id
) comps_agg on comps_agg.show_id = s.id;
    `;

    await client.query(sql);
    console.log('✅ View updated successfully');

    // Verify fix
    console.log('\nVerifying Baltimore show comps...');
    const result = await client.query(`
      SELECT city, show_date, total_comps
      FROM show_summary_view
      WHERE city = 'Baltimore'
    `);

    if (result.rows.length > 0) {
      const { city, show_date, total_comps } = result.rows[0];
      console.log(`  ${city} (${show_date}): ${total_comps} comps`);
      if (total_comps === 3) {
        console.log('  ✅ Correct! Was 279 (Cartesian product), now 3');
      } else {
        console.log(`  ⚠️  Expected 3, got ${total_comps}`);
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixView();
