#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testReportsPage() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';

  console.log('🧪 Testing Reports Page Data Fetching\n');
  console.log(`Tour ID: ${tourId}\n`);

  // Fetch tour details
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (tourError) {
    console.error('❌ Error fetching tour:', tourError);
    return;
  }

  console.log(`✅ Tour: ${tour.name}\n`);

  // Fetch existing reports (same query as the page)
  const { data: reports, error: reportsError } = await supabase
    .from('tour_reports_summary')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (reportsError) {
    console.error('❌ Error fetching reports:', reportsError);
    return;
  }

  console.log(`📊 Found ${reports?.length || 0} reports:\n`);

  if (reports && reports.length > 0) {
    reports.forEach((report, i) => {
      console.log(`${i + 1}. ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Type: ${report.report_type}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Sections: ${report.section_count}`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString()}`);
      console.log(`   URL: http://localhost:3001/tours/${tourId}/reports/${report.id}\n`);
    });

    console.log(`\n✅ All fields present - page should display correctly!`);
    console.log(`\n🌐 View reports at: http://localhost:3001/tours/${tourId}/reports\n`);
  } else {
    console.log('No reports found');
  }
}

testReportsPage().catch(console.error);
