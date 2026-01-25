import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateView() {
  console.log('🔄 Updating tour_reports_summary view...\n');

  const sql = `
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
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    // Try using direct query if RPC doesn't exist
    try {
      // @ts-ignore - using internal method
      const { error: queryError } = await supabase.from('_sql').select('*').eq('query', sql);

      if (queryError) {
        console.error('❌ Error updating view:', queryError);
        console.log('\n💡 Try running this SQL manually in Supabase dashboard:\n');
        console.log(sql);
        return;
      }
    } catch (e) {
      console.error('❌ Error updating view:', error);
      console.log('\n💡 Try running this SQL manually in Supabase dashboard:\n');
      console.log(sql);
      return;
    }
  }

  console.log('✅ View updated successfully!\n');

  // Test the view
  const { data: reports, error: testError } = await supabase
    .from('tour_reports_summary')
    .select('id, title, section_count')
    .limit(3);

  if (testError) {
    console.error('❌ Error testing view:', testError);
  } else {
    console.log('📊 Testing view - showing first 3 reports:\n');
    reports?.forEach(report => {
      console.log(`  - ${report.title}`);
      console.log(`    Sections: ${report.section_count}`);
    });
  }
}

updateView().catch(console.error);
