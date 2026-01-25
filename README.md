# GMS Inventory Tracker

Multi-tour merchandise inventory and sales tracking system with AI-powered document parsing.

**Current Status:** Ghost 2025 data loaded. Database migration required to complete setup.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see below)
# Edit .env.local with your Supabase credentials

# 3. Apply database migration (REQUIRED)
# See APPLY_MIGRATION.md for instructions

# 4. Verify setup
npm run db:check-migrations

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📋 Prerequisites

1. **Supabase Project** - https://supabase.com
2. **Anthropic API Key** - https://console.anthropic.com
3. **Node.js 18+** and npm

---

## ⚙️ Environment Setup

### Step 1: Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project (or create new one)
3. Go to **Settings** → **API**

Copy these values:

```
Project URL:        https://YOUR_PROJECT_ID.supabase.co
anon key:           eyJhbGciOiJ... (public key)
service_role key:   eyJhbGciOiJ... (KEEP SECRET!)
```

### Step 2: Get Database Password

1. In Supabase Dashboard → **Settings** → **Database**
2. Look for "Connection string" section
3. Find password shown as `[YOUR-PASSWORD]`

### Step 3: Get Anthropic API Key

1. Go to https://console.anthropic.com
2. Navigate to API Keys
3. Create new key
4. Copy it (shown only once!)

### Step 4: Create `.env.local`

Create file in project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Direct Connection (for scripts)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres

# Anthropic API (for PDF parsing)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**⚠️ NEVER commit `.env.local` - it contains secrets!**

---

## 🗄️ Database Setup

### CRITICAL: Apply Migration First

The app won't work without these database views. **You must apply the migration manually.**

#### Why Manual Migration?

Direct PostgreSQL connection has DNS resolution issues with Supabase. The migration must be applied via Supabase Dashboard.

#### Apply Migration (5 minutes)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to **SQL Editor** (left sidebar)

2. **Run Migration SQL**
   - Click "+ New query"
   - Copy SQL from **[APPLY_MIGRATION.md](APPLY_MIGRATION.md)**
   - Paste and click **Run**

3. **Verify Success**
   ```bash
   npm run db:check-migrations
   ```

   Expected output:
   ```
   ✅ product_summary_view: Exists
   ✅ show_summary_view: Exists
   ✅ po_open_qty_view: Exists
   ✅ stock_movement_view: Exists
   ```

**See [APPLY_MIGRATION.md](APPLY_MIGRATION.md) for detailed SQL and instructions.**

### Initial Schema

The initial schema (001_initial_schema.sql) should already be applied in Supabase. It includes:

- Core tables (tours, shows, products, sales, etc.)
- Basic views (inventory_balances)

If starting fresh, apply both migrations:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_tracker_views.sql`

---

## 📊 Ghost 2025 Tour (Pre-loaded)

**Data Status:** ✅ Loaded and verified

- **Tour ID**: `123e4567-e89b-12d3-a456-426614174000`
- **Name**: SKELETOUR NORTH AMERICA 2025
- **Shows**: 27
- **Products**: 43 (140 size variants)
- **Sales Records**: 1,990+
- **Forecast Entries**: 61 projections

**Access Dashboards:**

```
COGS Report:    /tours/123e4567-e89b-12d3-a456-426614174000/cogs
Inventory:      /tours/123e4567-e89b-12d3-a456-426614174000/inventory
Projections:    /tours/123e4567-e89b-12d3-a456-426614174000/projections
```

**Verify Data Loaded:**

```bash
npm run ghost:verify
```

---

## 🔧 Available Scripts

### Development

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database Verification

```bash
npm run db:verify               # Test all database views and queries
npm run db:check-migrations     # Check which views exist
npm run ghost:verify            # Verify Ghost 2025 data loaded
```

### Data Loading

```bash
# Load all Ghost 2025 data from Excel
export $(cat .env.local | grep -v "^#" | xargs) && \
  node scripts/load-all-ghost-data.js

# Verify loaded data
npm run ghost:verify
```

---

## 📁 Project Structure

```
/app                          # Next.js App Router
  /api                        # API endpoints
    /parse/                   # Document parsing API
    /parsed-documents/        # Document review API
    /tours/[id]/              # Tour data APIs
      /cogs/                  # COGS calculations
      /inventory/             # Inventory data
      /shows/                 # Show listings
      /purchase-orders/       # PO data
  /dashboard                  # Admin dashboard
    /parsed-documents/        # Document review UI
  /tours/[id]                 # Tour detail pages
    /cogs/                    # COGS report
    /inventory/               # Inventory tracker
    /projections/             # Sales projections
  /upload/                    # File upload pages

/components                   # React components
  /review/                    # Document review forms
  /upload/                    # File upload components

/lib                          # Utilities
  /supabase/                  # Supabase client
  /ai/                        # Claude API integration

/scripts                      # Data loading scripts
  load-all-ghost-data.js      # Main Ghost data loader
  verify-loaded-data.js       # Data verification
  test-api-endpoints.js       # API testing
  check-migrations.js         # Migration status

/supabase/migrations          # Database migrations
  001_initial_schema.sql      # Core schema
  002_tracker_views.sql       # Views (MUST APPLY)

/ghosttrackers                # Source Excel files
  01 GHOST 2025 TOUR.xlsx     # Ghost tour data
```

---

## 🎯 Features

### ✅ Document Upload & Review
- Upload PDFs (POs, Packing Lists, Sales Reports, Settlements)
- AI-powered parsing with Claude API
- Human review interface with validation
- Edit and approve before posting to database

### ✅ COGS Reporting
- Product-level profitability analysis
- Show-level performance metrics
- Margin calculations and percentages
- Top/bottom performers ranking

### ✅ Inventory Tracking
- Real-time inventory balances
- Stock movement history
- Low stock and out-of-stock alerts
- Open PO tracking
- CSV export

### ✅ Sales Projections
- Multiple forecast scenarios
- Product and show-level overrides
- Adjustable sales percentages
- Per-head calculations

---

## 🔌 Database Connection

### Connection Methods

**1. Supabase Dashboard (Recommended)**
- Most reliable
- No connection issues
- SQL Editor for queries
- Use for: Migrations, manual queries

**2. Supabase JS Client**
- Used by all app APIs and scripts
- Works through HTTPS
- Use for: App code, data loading scripts

**3. Direct PostgreSQL (Not Working)**
- DNS resolution fails for `db.*.supabase.co`
- May work with VPN/network changes
- Currently not supported in this project

### Why Direct Connection Fails

The hostname `db.mtfmckqbpykxblgpgnpo.supabase.co` doesn't resolve properly:

```bash
ping db.mtfmckqbpykxblgpgnpo.supabase.co
# ping: cannot resolve: unknown host
```

**Possible causes:**
- Network/VPN blocking Supabase domains
- DNS configuration issues
- Firewall rules

**Solutions implemented:**
- Use Supabase Dashboard for SQL operations
- Use Supabase JS client for data operations
- All scripts use `@supabase/supabase-js` package

### Connection String Format

```
# Format (for reference only - doesn't work)
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres

# What we use instead
Supabase JS Client with:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
```

---

## 🐛 Common Issues

### 1. "Could not find table 'product_summary_view'"

**Problem:** Database migration not applied

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run migration from [APPLY_MIGRATION.md](APPLY_MIGRATION.md)
3. Verify with: `npm run db:check-migrations`

### 2. "getaddrinfo ENOTFOUND db.*.supabase.co"

**Problem:** Direct PostgreSQL connection fails (expected)

**Solution:** This is normal. Use:
- Supabase Dashboard for SQL operations
- Supabase JS client for data operations (already implemented)

### 3. No Data in Dashboards

**Problem:** Migration applied but cache not refreshed

**Solution:**
```bash
# Restart dev server
# Press Ctrl+C, then:
npm run dev
```

### 4. "Missing Supabase credentials"

**Problem:** `.env.local` not configured

**Solution:**
1. Create `.env.local` file
2. Add credentials from Supabase Dashboard
3. See "Environment Setup" section above

### 5. Sales Show $0 Revenue

**Problem:** Unit prices not loaded (expected)

**Explanation:** Ghost Excel sales sheets don't include pricing data. Sales quantities are loaded, but `unit_price` and `gross_sales` are set to 0.

**Future Enhancement:** Load pricing from "Selling Prices" sheet

### 6. Inventory Balances Show 0

**Problem:** No purchase orders loaded (expected)

**Explanation:** Ghost Excel doesn't contain PO data. Inventory will populate when:
- POs created via app upload
- Packing lists received
- Sales deducted

---

## 📚 Documentation Files

- **[README.md](README.md)** (this file) - Complete setup guide
- **[APPLY_MIGRATION.md](APPLY_MIGRATION.md)** - Migration instructions and SQL
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Setup status and verification
- **[scripts/DATA_LOAD_SUMMARY.md](scripts/DATA_LOAD_SUMMARY.md)** - Ghost data load details

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Import repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ANTHROPIC_API_KEY`

3. **Post-Deployment**
   - Verify migration applied to production database
   - Test document upload
   - Verify dashboards load

---

## 🔐 Security Notes

1. **Never commit `.env.local`** - Added to `.gitignore`
2. **Service role key** - Only use server-side
3. **Anthropic API key** - Only use server-side
4. **Database password** - Don't share or commit

---

## 💡 Development Tips

### Quick Verification After Changes

```bash
# Build check
npm run build

# Database check
npm run db:verify

# Data check
npm run ghost:verify
```

### Testing API Endpoints

```bash
# Test all API queries
npm run db:verify

# Should show:
# ✅ product_summary_view: Found products
# ✅ show_summary_view: Found shows
# ✅ sales: Found records
```

### Debugging Database Issues

1. **Check migration status**
   ```bash
   npm run db:check-migrations
   ```

2. **Verify data loaded**
   ```bash
   npm run ghost:verify
   ```

3. **Test API queries**
   ```bash
   npm run db:verify
   ```

4. **Check Supabase Dashboard**
   - Go to Table Editor
   - Run manual queries
   - Check Row counts

---

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Supabase JS Client
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Tables**: TanStack Table (React Table)
- **File Upload**: React Dropzone
- **Excel Parsing**: xlsx package

---

## 📝 License

Proprietary - Global Merch Services

---

## 🆘 Need Help?

**Setup Issues:**
1. Read this README completely
2. Check [APPLY_MIGRATION.md](APPLY_MIGRATION.md)
3. Review [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
4. Run diagnostic: `npm run db:verify`

**Database Connection:**
- Use Supabase Dashboard for SQL operations
- Direct PostgreSQL connection not supported
- All scripts use Supabase JS client

**Data Verification:**
```bash
npm run ghost:verify  # Check Ghost 2025 data
npm run db:verify     # Check database views
```

---

## 🎉 Quick Test

After setup, verify everything works:

```bash
# 1. Check migration applied
npm run db:check-migrations

# 2. Verify Ghost data loaded
npm run ghost:verify

# 3. Test API queries
npm run db:verify

# 4. Start server
npm run dev

# 5. Visit Ghost COGS report
# http://localhost:3000/tours/123e4567-e89b-12d3-a456-426614174000/cogs

# Should see:
# - Product sales data
# - Revenue/COGS/margin calculations
# - Show-level performance
```

If all steps pass: **✅ Setup complete!**
