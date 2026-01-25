#!/bin/bash
# Quick database query using Supabase client
# Usage: ./scripts/query.sh "table_name" "columns" "limit"

TABLE=${1:-"tours"}
COLUMNS=${2:-"*"}
LIMIT=${3:-10}

cd "$(dirname "$0")/.." || exit

export $(cat .env.local | grep -v '^#' | xargs)

node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('$TABLE')
    .select('$COLUMNS')
    .limit($LIMIT);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Results:');
  console.table(data);
})();
"
