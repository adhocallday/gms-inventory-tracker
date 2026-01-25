# Tour Creation Wizard

## Overview

The Tour Creation Wizard is a multi-step admin interface that allows users to set up new tours with AI-assisted data entry. The wizard guides users through 5 steps to configure tours, shows, products, and initial inventory before launching the inventory tracking system.

**Last Updated:** January 25, 2026
**Status:** ✅ **FULLY FUNCTIONAL**

---

## Architecture

### Multi-Step Wizard Flow

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1: Basic Tour Info                                       │
│  - Tour name, artist, dates, description                       │
│  - Artist selection (existing or new)                          │
│  - Organization: Artist → Tours                                │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Step 2: Tour Schedule                                         │
│  - Upload PDF/CSV/Excel with show dates                        │
│  - AI extracts: date, venue, city, state, country, capacity   │
│  - Manual entry fallback                                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Step 3: Product Catalog                                       │
│  - Upload product catalog (PDF/CSV/Excel/images)               │
│  - AI extracts: SKU, name, category, price, sizes             │
│  - Manual entry fallback                                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Step 4: Initial Inventory (Optional)                          │
│  - Upload inventory spreadsheet (CSV/Excel)                    │
│  - AI extracts: SKU, size, location, quantity                 │
│  - Locations: Warehouse, Webstore, Road, Retail               │
│  - Can skip if starting fresh                                  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Step 5: Review & Create                                       │
│  - Summary of all entered data                                 │
│  - Validation checks                                           │
│  - Create tour button                                          │
│  - Redirect to new tour page                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### UI Components

```
components/admin/
├── TourCreationWizard.tsx          # Main wizard orchestrator (state management)
└── wizard/
    ├── TourBasicInfoStep.tsx       # Step 1: Basic tour info
    ├── TourScheduleStep.tsx        # Step 2: Shows with AI parsing
    ├── ProductCatalogStep.tsx      # Step 3: Products with AI parsing
    ├── InitialInventoryStep.tsx    # Step 4: Initial inventory (optional)
    └── ReviewStep.tsx              # Step 5: Review and create
```

### API Endpoints

```
app/api/admin/
├── parse-schedule/
│   └── route.ts                    # POST - Parse tour schedule from document
├── parse-products/
│   └── route.ts                    # POST - Parse product catalog from document
├── parse-inventory/
│   └── route.ts                    # POST - Parse inventory spreadsheet
└── create-tour/
    └── route.ts                    # POST - Create tour with all related data
```

### Routes

```
app/admin/
└── tours/
    └── new/
        └── page.tsx                # Admin tour creation page
```

---

## Data Models

### Tour Data

```typescript
interface TourData {
  name: string;           // e.g., "Re-Imperatour 2025"
  artist: string;         // e.g., "Ghost"
  startDate: string;      // YYYY-MM-DD format
  endDate: string;        // YYYY-MM-DD format
  description?: string;   // Optional tour description
}
```

### Show

```typescript
interface Show {
  showDate: string;       // YYYY-MM-DD format
  venueName: string;      // e.g., "Amalie Arena"
  city: string;           // e.g., "Tampa"
  state: string;          // 2-letter code, e.g., "FL"
  country: string;        // 2-letter code, e.g., "US"
  capacity?: number;      // Venue capacity (optional)
}
```

### Product

```typescript
interface Product {
  sku: string;            // e.g., "GHOSRX203729BK"
  name: string;           // e.g., "Black T-Shirt Skeleton Tour"
  category: string;       // e.g., "T-Shirt", "Hoodie", "Poster"
  basePrice: number;      // e.g., 30.00
  sizes: string[];        // e.g., ["S", "M", "L", "XL", "2XL", "3XL"]
  imageUrl?: string;      // Optional product image URL
}
```

### Inventory Item

```typescript
interface InventoryItem {
  sku: string;            // Must match product SKU
  size: string;           // Must match product sizes
  location: string;       // "Warehouse", "Webstore", "Road", "Retail"
  quantity: number;       // Number of units (>= 0)
}
```

---

## AI Parsing Endpoints

### 1. Parse Schedule (`/api/admin/parse-schedule`)

**Purpose:** Extract tour schedule from uploaded documents

**Input:**
- `file`: PDF, CSV, or Excel file
- `tourName`: Tour name for context
- `artist`: Artist name for context

**Output:**
```json
{
  "shows": [
    {
      "showDate": "2025-01-15",
      "venueName": "Amalie Arena",
      "city": "Tampa",
      "state": "FL",
      "country": "US",
      "capacity": 19092
    }
  ],
  "totalExtracted": 25,
  "validShows": 25
}
```

**AI Instructions:**
- Extract date, venue, city, state, country, capacity
- Format dates as YYYY-MM-DD
- Use 2-letter state/country codes
- Filter out invalid or incomplete entries

---

### 2. Parse Products (`/api/admin/parse-products`)

**Purpose:** Extract product catalog from uploaded documents

**Input:**
- `file`: PDF, CSV, Excel, or image
- `tourName`: Tour name for context
- `products`: Existing products (to avoid duplicates)

**Output:**
```json
{
  "products": [
    {
      "sku": "GHOSRX203729BK",
      "name": "Black T-Shirt Skeleton Tour",
      "category": "T-Shirt",
      "basePrice": 30.00,
      "sizes": ["S", "M", "L", "XL", "2XL", "3XL"]
    }
  ],
  "totalExtracted": 15,
  "validProducts": 15,
  "duplicatesFiltered": 0
}
```

**AI Instructions:**
- Extract SKU, name, category, price, sizes
- Validate against existing SKUs to avoid duplicates
- Use standard size abbreviations (S, M, L, XL, 2XL, 3XL)
- Category must be one of: T-Shirt, Long-Sleeve, Hoodie, Sweatshirt, Tank, Poster, Vinyl, CD, Accessory, Hat, Bag, Other

---

### 3. Parse Inventory (`/api/admin/parse-inventory`)

**Purpose:** Extract initial inventory from spreadsheets

**Input:**
- `file`: CSV or Excel file
- `products`: Product catalog for SKU/size validation

**Output:**
```json
{
  "inventory": [
    {
      "sku": "GHOSRX203729BK",
      "size": "M",
      "location": "Warehouse",
      "quantity": 150
    }
  ],
  "totalExtracted": 100,
  "validItems": 98,
  "totalUnits": 5420,
  "uniqueSKUs": 15
}
```

**AI Instructions:**
- Extract SKU, size, location, quantity
- Validate SKUs against product catalog
- Map location names to standard locations (Warehouse, Webstore, Road, Retail)
- Filter out negative quantities and invalid entries

---

### 4. Create Tour (`/api/admin/create-tour`)

**Purpose:** Create tour and all related records in database

**Input:**
```json
{
  "tourData": { /* TourData */ },
  "shows": [ /* Show[] */ ],
  "products": [ /* Product[] */ ],
  "initialInventory": [ /* InventoryItem[] */ ]
}
```

**Output:**
```json
{
  "tourId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Tour created successfully",
  "summary": {
    "shows": 25,
    "products": 15,
    "inventoryItems": 98
  }
}
```

**Database Operations:**
1. Insert tour into `tours` table
2. Insert shows into `shows` table (with tour_id FK)
3. Insert products into `products` table (with tour_id FK if column exists)
4. Insert inventory into `inventory_movements` or `inventory` table

---

## Usage Guide

### For Users

1. **Access the wizard:**
   - Click "Admin" link in main navigation
   - Or navigate to `/admin/tours/new`

2. **Step 1: Basic Info**
   - Enter tour name (e.g., "Re-Imperatour 2025")
   - Select existing artist or add new artist
   - Set start and end dates
   - Add optional description
   - Click "Next: Tour Schedule"

3. **Step 2: Shows**
   - **Option A - AI Upload:**
     - Drag and drop tour schedule PDF/CSV
     - AI extracts all show dates automatically
     - Review extracted data
   - **Option B - Manual Entry:**
     - Click "+ Add Show"
     - Enter date, venue, city, state, country manually
   - Click "Next: Products"

4. **Step 3: Products**
   - **Option A - AI Upload:**
     - Upload product catalog (PDF, CSV, Excel, or images)
     - AI extracts SKU, name, category, price, sizes
     - Review extracted products
   - **Option B - Manual Entry:**
     - Click "+ Add Product"
     - Enter SKU, name, category, price
     - Toggle size checkboxes
   - Click "Next: Initial Inventory"

5. **Step 4: Initial Inventory (Optional)**
   - **Option A - AI Upload:**
     - Upload inventory spreadsheet (CSV/Excel)
     - AI extracts SKU, size, location, quantity
     - Review extracted inventory
   - **Option B - Manual Entry:**
     - Click "+ Add Item"
     - Select SKU, size, location
     - Enter quantity
   - **Option C - Skip:**
     - Click "Next: Review" to start with zero inventory

6. **Step 5: Review & Create**
   - Expand sections to review all data
   - Check for validation warnings
   - Click "Create Tour"
   - Redirect to new tour page

### For Developers

**Adding a new wizard step:**

1. Create component in `components/admin/wizard/YourStep.tsx`
2. Add step interface to `TourCreationWizard.tsx`:
   ```typescript
   type WizardStep = 'basic' | 'schedule' | 'products' | 'inventory' | 'review' | 'yourStep';
   ```
3. Add step metadata:
   ```typescript
   const steps = [
     // ... existing steps
     { id: 'yourStep', label: 'Your Step', description: 'Description' }
   ];
   ```
4. Add conditional rendering in wizard:
   ```typescript
   {currentStep === 'yourStep' && (
     <YourStep
       data={yourData}
       onUpdate={setYourData}
       onNext={nextStep}
       onPrev={prevStep}
     />
   )}
   ```

**Adding AI parsing for a new data type:**

1. Create API route: `app/api/admin/parse-your-data/route.ts`
2. Use `parseDocument` from `lib/ai/claude-client.ts`
3. Provide clear extraction instructions
4. Validate and return structured JSON
5. Call from UI component via `fetch`

---

## Technical Patterns

### AI Upload Pattern

All wizard steps with AI capabilities follow this pattern:

```typescript
const onDrop = useCallback(async (acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) return;

  const file = acceptedFiles[0];
  setParsing(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contextField', contextValue);

    const response = await fetch('/api/admin/parse-XXX', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Parsing failed');
    }

    const result = await response.json();
    onUpdate([...existing, ...result.data]);
  } catch (err: any) {
    setError(err.message);
    console.error('Parse error:', err);
  } finally {
    setParsing(false);
  }
}, [dependencies]);
```

### State Management

The wizard uses React `useState` to manage data across steps:

```typescript
const [tourData, setTourData] = useState<TourData>({ ... });
const [shows, setShows] = useState<Show[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [initialInventory, setInitialInventory] = useState<InventoryItem[]>([]);
```

Each step receives:
- Current data (read-only props)
- Update handler (`onUpdate`)
- Navigation handlers (`onNext`, `onPrev`)

### Validation

Validation happens at two levels:

1. **Step Level:** Each step validates its own data before allowing "Next"
2. **Review Step:** Final validation before tour creation

Example validation in ReviewStep:

```typescript
const validation = {
  missingFields: [] as string[],
  warnings: [] as string[]
};

if (!tourData.name) validation.missingFields.push('Tour name');
if (shows.length === 0) validation.warnings.push('No shows added');
```

---

## Cost Optimization

### Claude API Usage

Each AI parsing operation uses Claude's native PDF reading:

**Typical Costs:**
- Schedule parsing (1-3 pages): $0.005 - $0.015
- Product catalog (5-10 pages): $0.02 - $0.05
- Inventory spreadsheet (1-2 pages): $0.005 - $0.01

**Total per tour creation:** ~$0.03 - $0.08

### Optimization Tips

1. **Batch uploads:** Upload one comprehensive document instead of multiple small files
2. **Manual entry fallback:** Use AI only when you have well-structured documents
3. **Validation filtering:** AI returns all extracted data, then backend filters invalid entries
4. **No retries on success:** Single API call per upload (no automatic retries)

---

## Troubleshooting

### AI Parsing Issues

**Problem:** AI doesn't extract expected data

**Solutions:**
1. Check document format (PDFs work best)
2. Ensure text is selectable (not scanned images without OCR)
3. Verify document contains the expected data fields
4. Check API logs for Claude's response
5. Use manual entry as fallback

---

**Problem:** Duplicate SKUs detected

**Solution:**
- AI automatically filters duplicates based on existing products
- Check `duplicatesFiltered` count in response
- Manually edit product list if needed

---

**Problem:** Invalid dates or locations

**Solution:**
- AI validates against expected formats (YYYY-MM-DD, 2-letter codes)
- Invalid entries are filtered out
- Check `validShows` vs `totalExtracted` in response
- Manually correct or re-upload

---

### Database Issues

**Problem:** Tour creation fails with foreign key error

**Solutions:**
1. Check if products table has `tour_id` column
2. Endpoint has fallback logic to retry without `tour_id`
3. Verify shows reference valid tour_id
4. Check database logs for specific constraint violations

---

**Problem:** Inventory not appearing after tour creation

**Solutions:**
1. Check if `inventory_movements` or `inventory` table exists
2. Verify location names are lowercase (warehouse, webstore, road, retail)
3. Check `location` column accepts your values
4. Query database directly to verify insert succeeded

---

## Future Enhancements

### Planned Features

1. **Product Image Upload:**
   - Direct image upload to Supabase Storage
   - Automatic image resizing/optimization
   - Preview before upload

2. **Bulk Edit:**
   - Edit multiple shows/products at once
   - CSV import/export for offline editing
   - Undo/redo support

3. **Template Tours:**
   - Save tour configurations as templates
   - Quick-create from previous tour
   - Copy products/shows from existing tours

4. **Advanced Validation:**
   - Check for conflicting show dates
   - Validate product SKU format
   - Detect potential pricing errors

5. **Progress Persistence:**
   - Auto-save wizard state to localStorage
   - Resume incomplete tour creation
   - Warning before leaving page

---

## Related Documentation

- **[PDF Processing Guide](./PDF_PROCESSING.md)** - How we use Claude API for document parsing
- **[Agent Architecture](./AGENT_ARCHITECTURE.md)** - AI agent design patterns
- **[Database Schema](../supabase/migrations/)** - Database table structures

---

## Support

**Issues:** Check logs at:
- Browser console (client-side errors)
- Vercel logs (API errors)
- Database logs (Supabase)

**Questions:** Review this documentation or check existing tours for examples

**Last Updated:** January 25, 2026
**Maintainers:** Claude Sonnet 4.5 + Engineering Team
