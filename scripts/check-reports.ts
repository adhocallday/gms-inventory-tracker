import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkReports() {
  console.log('🔍 Checking reports in database...\n');

  // Check tour_reports table
  const { data: reports, error } = await supabase
    .from('tour_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching reports:', error);
    return;
  }

  console.log(`📊 Found ${reports?.length || 0} reports in tour_reports table\n`);

  if (reports && reports.length > 0) {
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Tour ID: ${report.tour_id}`);
      console.log(`   Type: ${report.report_type}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString()}`);
      console.log(`   Generated: ${report.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A'}`);
      console.log('');
    });
  }

  // Check tour_reports_summary view
  const { data: summary, error: summaryError } = await supabase
    .from('tour_reports_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (summaryError) {
    console.error('❌ Error fetching reports summary:', summaryError);
    return;
  }

  console.log(`\n📊 Found ${summary?.length || 0} reports in tour_reports_summary view\n`);

  if (summary && summary.length > 0) {
    summary.forEach((report, index) => {
      console.log(`${index + 1}. ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Tour: ${report.tour_name}`);
      console.log(`   Shows: ${report.show_count}`);
      console.log('');
    });
  }
}

checkReports().catch(console.error);
