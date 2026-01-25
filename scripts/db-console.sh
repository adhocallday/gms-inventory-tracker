#!/bin/bash
# Open interactive database console
# Usage: ./scripts/db-console.sh

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

echo "Opening database console..."
echo "Type \\q to exit, \\dt to list tables, \\d table_name to describe a table"
echo ""
/opt/homebrew/opt/postgresql@15/bin/psql "$DATABASE_URL"
