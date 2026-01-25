#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugProductionReports() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';

  console.log('🔍 Debugging Production Reports\n');

  // Exact same query as the page
  const { data: reports, error } = await supabase
    .from('tour_reports_summary')
    .select('*, section_count')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total reports returned: ${reports?.length || 0}\n`);

  if (reports && reports.length > 0) {
    console.log('All reports:\n');
    reports.forEach((report, i) => {
      console.log(`${i + 1}. ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Section Count: ${report.section_count} ${report.section_count === 0 ? '⚠️ ZERO' : '✅'}`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString()}\n`);
    });

    console.log('\n📋 Summary:');
    console.log(`   Total: ${reports.length}`);
    console.log(`   With 0 sections: ${reports.filter(r => r.section_count === 0).length}`);
    console.log(`   With 7 sections: ${reports.filter(r => r.section_count === 7).length}`);
  }
}

debugProductionReports().catch(console.error);
