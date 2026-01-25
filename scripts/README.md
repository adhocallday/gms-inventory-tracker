# Database Scripts

✅ **Database is connected and ready!**

Quick database access tools for development using the Supabase client.

## Quick Start

### Test Connection
```bash
node scripts/test-db.js
```

### Query a Table
```bash
# Query tours
./scripts/query.sh tours "id,name,artist" 5

# Query products
./scripts/query.sh products "sku,description,product_type" 10

# Query shows
./scripts/query.sh shows "show_date,venue_name,city,state" 20
```

### Load Seed Data
```bash
npm run db:seed
```

## Available Tools

### 1. Test Database Connection
```bash
node scripts/test-db.js
```
Shows your database connection status and lists tours.

### 2. Quick Table Query
```bash
./scripts/query.sh <table> <columns> <limit>

# Examples:
./scripts/query.sh tours "*" 5
./scripts/query.sh products "sku,description" 10
./scripts/query.sh shows "show_date,venue_name" 20
```

### 3. Interactive CLI (Coming Soon)
```bash
node scripts/db-cli.js
```

## Using Supabase Client Directly

You can query the database using Node.js:

```javascript
const { createClient } = require('@supabase/supabase-js');

// Load env vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query data
const { data, error } = await supabase
  .from('tours')
  .select('*')
  .limit(10);
```

## Common Queries

```bash
# List all tables (via Supabase dashboard or SQL editor)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Count products by type
SELECT product_type, COUNT(*) as count
FROM products
GROUP BY product_type;

# View recent parsed documents
SELECT id, doc_type, status, filename, created_at
FROM parsed_documents
ORDER BY created_at DESC
LIMIT 10;

# Check inventory balances
SELECT * FROM inventory_balances LIMIT 10;

# View tour products with costs
SELECT
  p.sku,
  p.description,
  tp.size,
  tp.full_package_cost,
  tp.suggested_retail
FROM tour_products tp
JOIN products p ON p.id = tp.product_id
WHERE tp.tour_id = '123e4567-e89b-12d3-a456-426614174000'
LIMIT 10;
```

## Troubleshooting

### Connection Issues
If you can't connect:
1. Check that `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify your Supabase project is active
3. Run `node scripts/test-db.js` to diagnose

### Query Errors
- Use the Supabase Dashboard SQL Editor for complex SQL
- The scripts use the Supabase client, which works through the REST API
- For raw SQL, use the dashboard's SQL editor

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/mtfmckqbpykxblgpgnpo)
- [SQL Editor](https://supabase.com/dashboard/project/mtfmckqbpykxblgpgnpo/sql)
- [Database Tables](https://supabase.com/dashboard/project/mtfmckqbpykxblgpgnpo/editor)
