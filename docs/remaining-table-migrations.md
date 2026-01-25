# Remaining Table Migrations

This document tracks tables that haven't been migrated to the DataTable component yet. These can be migrated later as needed.

## Priority 1: Standalone Inventory & COGS Pages

### 1. `/app/tours/[id]/inventory/page.tsx`

**Current State:** Client-side page with two tables
- **Balance table** (line 370): Shows inventory balances with filters
- **Movements table** (line 492): Shows stock movements/deliveries

**Data Structure:**
```typescript
interface InventoryItem {
  product_id: string;
  sku: string;
  description: string;
  size: string;
  product_type: string;
  total_received: number;
  total_sold: number;
  total_comps: number;
  balance: number;
  full_package_cost: number;
  suggested_retail: number;
}

interface StockMovement {
  received_date: string;
  delivery_number: string;
  sku: string;
  size: string;
  quantity_received: number;
  vendor: string;
}
```

**Migration Plan:**
1. Create `components/tours/InventoryBalanceTable.tsx` (extended version with filters)
2. Create `components/tours/StockMovementTable.tsx`
3. Update page to use both components
4. Integrate existing filters (SKU search, stock level, product type)

**Features to Preserve:**
- Search by SKU
- Filter by stock level (in-stock, low, out)
- Filter by product type
- View toggle (balance vs movements)
- Summary stats cards at top

**Complexity:** Medium - Has client-side filtering and multiple views

---

### 2. `/app/tours/[id]/cogs/page.tsx`

**Current State:** Dedicated COGS analysis page

**Migration Plan:**
1. Use existing `CogsTable` component
2. Add filtering capabilities if needed
3. May already be using the component - verify

**Complexity:** Low - Likely just needs to import CogsTable

---

## Priority 2: Show Detail Page

### 3. `/app/tours/[id]/shows/[showId]/page.tsx`

**Location:** Individual show detail page

**Tables Present:** Need to inspect file to identify

**Migration Plan:**
1. Read file to identify table structure
2. Determine if it's sales by product, size breakdown, or other data
3. Create specific component or reuse existing

**Complexity:** Unknown - needs inspection

---

## Priority 3: Product Detail Page

### 4. `/app/products/[id]/page.tsx`

**Location:** Individual product detail page

**Tables Present:** Likely product sales across tours or inventory

**Migration Plan:**
1. Inspect to identify data structure
2. Create ProductSalesTable or similar component
3. Integrate with existing product views

**Complexity:** Unknown - needs inspection

---

## Priority 4: Admin Pages

### 5. Admin Dashboard Tables

**Location:** `/app/admin/page.tsx` and other admin pages

**Status:** Admin tours table already migrated ✅

**Other potential tables:**
- Products listing
- Documents listing
- System logs/activity

**Migration Plan:** Inspect admin pages and migrate as needed

---

## Priority 5: Document Pages

### 6. `/app/dashboard/parsed-documents/page.tsx`

**Purpose:** List of parsed documents

**Likely Columns:**
- Document type
- Status
- Filename
- Upload date
- Actions

**Migration Plan:**
1. Create `components/documents/ParsedDocumentsTable.tsx`
2. Use Badge for status
3. Add sorting by date, type, status
4. Include action buttons (view, delete, etc.)

**Complexity:** Low-Medium

---

### 7. `/app/dashboard/parsed-documents/[id]/page.tsx`

**Purpose:** Individual document detail

**Tables Present:** Likely shows parsed data in table format

**Migration Plan:**
1. Inspect structure
2. Create DocumentDataTable if needed
3. May be JSON viewer rather than table

**Complexity:** Unknown

---

## Migration Checklist Template

When migrating a table:

- [ ] Read current implementation
- [ ] Identify data structure and types
- [ ] Create dedicated table component in appropriate folder
- [ ] Define column structure with ColumnDef
- [ ] Add sorting where appropriate
- [ ] Include proper empty state with icon
- [ ] Test loading state
- [ ] Update parent page/component to use new table
- [ ] Verify all functionality preserved
- [ ] Commit with clear description

---

## Component Naming Convention

**Location:**
- Tour-specific: `components/tours/[Name]Table.tsx`
- Admin-specific: `components/admin/[Name]Table.tsx`
- Document-specific: `components/documents/[Name]Table.tsx`
- Product-specific: `components/products/[Name]Table.tsx`

**Examples:**
- `components/tours/InventoryBalanceTable.tsx`
- `components/admin/ProductsTable.tsx`
- `components/documents/ParsedDocumentsTable.tsx`

---

## Already Migrated ✅

1. **ShowsTable** - Tour show listings
2. **ToursTable** - Admin tours list
3. **CogsTable** - Cost of goods sold
4. **InventoryTable** - Inventory balances (basic version)

---

## Notes

- All migrated tables should extend DataTable component
- Use NumericCell and DateCell helpers for formatting
- Include proper TypeScript types
- Add empty states with relevant icons from lucide-react
- Enable sorting on meaningful columns
- Use consistent spacing (py-4 for cells)
- Include loading states via DataTable's loading prop
