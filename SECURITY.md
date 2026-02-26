# Security Documentation - GMS Inventory Tracker

**Last Audit:** January 26, 2026

---

## Current Security Status Overview

| Area | Status | Priority |
|------|--------|----------|
| Authentication | Not Implemented | Future |
| Database RLS | Partial (12/27 tables) | Medium |
| Secrets Management | Good | - |
| API Route Protection | Not Implemented | Future |
| HTTPS | Via Vercel (production) | - |

---

## Detailed Findings

### 1. Authentication System

**Status:** Not Implemented

**Current State:**
- No middleware.ts for route protection
- No auth packages installed (next-auth, clerk, @supabase/auth-helpers)
- All API routes publicly accessible

**Risk Level:** Medium (internal tool, not public-facing)

**Future Remediation:**
- Add Supabase Auth (built-in, free)
- Create auth middleware for protected routes
- Implement role-based access control

---

### 2. Database Row Level Security (RLS)

**Status:** Partial Implementation

#### Tables WITHOUT RLS (15 tables)

| Table | Contains | Risk |
|-------|----------|------|
| `tours` | Tour names, dates | Low |
| `products` | SKU catalog | Low |
| `tour_products` | Pricing data | Medium |
| `shows` | Venue/date info | Low |
| `sales` | Sales data | Medium |
| `comps` | Comp records | Low |
| `purchase_orders` | PO data | Medium |
| `po_line_items` | PO details | Medium |
| `packing_lists` | Receiving data | Low |
| `packing_list_items` | Receiving details | Low |
| `parsed_documents` | Uploaded docs | Medium |
| `ai_processing_logs` | AI logs | Low |
| `forecast_scenarios` | Forecasts | Low |
| `forecast_overrides` | Forecast data | Low |
| `design_assets` | Design files | Low |

#### Tables WITH RLS (12 tables)

| Table | Policies |
|-------|----------|
| `warehouse_locations` | CRUD for all users |
| `product_warehouse_allocations` | CRUD for all users |
| `product_show_projections` | CRUD for all users |
| `product_stock_movements` | CRUD for all users |
| `product_images` | View: anyone, Manage: authenticated |
| `tour_reports` | View: anyone, Manage: authenticated |
| `report_sections` | View: anyone, Manage: authenticated |
| `product_categories` | View: anyone, Manage: authenticated |
| `show_comps` | CRUD for all users |
| `reorder_thresholds` | CRUD for all users |
| `initial_inventory` | CRUD for all users |
| `show_deliveries` | CRUD for all users |

**Note:** Current RLS policies allow all authenticated users full access. When auth is added, policies should be refined for role-based access.

---

### 3. Admin Routes

**Status:** Unprotected

**Routes at Risk:**
```
/api/admin/apply-migration   - Can modify database schema
/api/admin/add-products      - Can add products
/api/admin/create-tour       - Can create tours
/api/admin/parse-schedule    - Can parse schedules
/api/admin/parse-inventory   - Can parse inventory
/api/admin/parse-products    - Can parse products
/api/admin/tours/[id]        - Can modify tours
/api/admin/tours/[id]/shows  - Can modify shows
```

**Current Mitigation:** These routes are not linked in UI, discovery is unlikely.

**Future Remediation:** Add admin role check middleware.

---

### 4. Secrets Management

**Status:** Good

**Positive Findings:**
- No hardcoded API keys found in codebase
- `.env.local` properly in `.gitignore`
- All secrets use environment variables
- `.env.local.example` documents required variables

**Files Checked:**
- All `.ts`, `.tsx`, `.js`, `.jsx` files
- No matches for common API key patterns (sk-, eyJ, AKIA, AIza)

---

### 5. Service Role Key Usage

**Status:** Review Needed

**Current Pattern:**
```typescript
// lib/supabase/client.ts
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}
```

**Usage:** Most API routes use `createServiceClient()` which bypasses RLS.

**Recommendation:** When auth is implemented:
- Use anon key with RLS for user-facing routes
- Reserve service role for admin/background tasks

---

## Connection Status

### Supabase Database

**Status:** Connected

```bash
# Verified with curl test
HTTP 200 OK from Supabase REST API
```

**Connection Details:**
- URL: Configured via `NEXT_PUBLIC_SUPABASE_URL`
- Anon Key: Configured via `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Key: Configured via `SUPABASE_SERVICE_ROLE_KEY`

### Vercel

**Status:** Not configured locally

**Note:** Install Vercel CLI for deployment management:
```bash
npm i -g vercel
vercel login
```

### Anthropic (Claude AI)

**Status:** Connected

**Model Used:** `claude-sonnet-4-20250514` (default)
**Features:** Document parsing, projection analysis

---

## Environment Configuration

### Required Variables

```bash
# .env.local (never commit!)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)

- All secrets should be configured in Vercel Environment Variables
- Use different values for production vs preview

---

## Recommendations

### Immediate (No Auth Changes)

1. **Document current state** - Done (this file)
2. **Review .gitignore** - Ensure all secret patterns excluded
3. **Add security headers** - Consider adding via next.config.js

### Future (When Ready)

1. **Add Supabase Auth**
   - Enable email/password auth
   - Add auth middleware

2. **Enable RLS on core tables**
   - Create migration for RLS policies
   - Test thoroughly before applying

3. **Protect admin routes**
   - Add admin role check
   - Log admin actions

4. **Switch to anon key**
   - Update routes to use anon key with RLS
   - Keep service role for specific admin tasks

---

## Audit History

| Date | Auditor | Findings |
|------|---------|----------|
| 2026-01-26 | Claude Code | Initial security audit |

---

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [README.md](./README.md) - Project overview
- [supabase/migrations/](./supabase/migrations/) - Database schema
