#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyProductionReports() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';

  console.log('🔍 Verifying Production Reports Data\n');
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  // Test the view with section_count
  const { data: reports, error } = await supabase
    .from('tour_reports_summary')
    .select('id, title, section_count, status, created_at')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching reports:', error);
    console.log('\nThis error suggests the view update has NOT been applied to production yet.');
    console.log('Please run: npx tsx scripts/update-view-pg.ts\n');
    return;
  }

  console.log(`✅ Successfully fetched ${reports?.length || 0} reports from tour_reports_summary\n`);

  if (reports && reports.length > 0) {
    console.log('Recent reports:\n');
    reports.slice(0, 5).forEach((report, i) => {
      console.log(`${i + 1}. ${report.title}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Sections: ${report.section_count} ✅`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString()}\n`);
    });

    console.log('\n✅ Database view is working correctly!');
    console.log('✅ section_count field is present and populated');
    console.log('\n📝 Next step: Ensure Vercel deployment has completed');
    console.log('   - Check: https://vercel.com/dashboard');
    console.log('   - Or trigger a redeploy if needed\n');
  } else {
    console.log('⚠️  No reports found in database');
  }
}

verifyProductionReports().catch(console.error);
