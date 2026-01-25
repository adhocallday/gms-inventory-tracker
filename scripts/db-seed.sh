#!/bin/bash
# Load seed data into database
# Usage: ./scripts/db-seed.sh

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

echo "Loading Ghost 2025 seed data..."
/opt/homebrew/opt/postgresql@15/bin/psql "$DATABASE_URL" -f supabase/seed_ghost_2025.sql

echo "✅ Seed data loaded successfully!"
