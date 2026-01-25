#!/bin/bash
# Quick database query helper
# Usage: ./scripts/db-query.sh "SELECT * FROM tours LIMIT 5"

if [ -z "$1" ]; then
  echo "Usage: $0 \"SQL QUERY\""
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  echo ""
  echo "To set it up:"
  echo "1. Go to Supabase Dashboard → Settings → Database"
  echo "2. Copy the Connection String (URI format)"
  echo "3. Add to .env.local: DATABASE_URL=postgresql://postgres:[PASSWORD]@..."
  exit 1
fi

# Run the query
/opt/homebrew/opt/postgresql@15/bin/psql "$DATABASE_URL" -c "$1"
