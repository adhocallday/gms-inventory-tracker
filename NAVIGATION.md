# GMS Inventory Tracker - Navigation Guide

## 🗺️ Main Routes

### Dashboard
- **URL:** `/`
- **Purpose:** View all tours, recent activity
- **Actions:** Click a tour to view details

### Tour Detail Page
- **URL:** `/tours/[id]`
- **Purpose:** Overview of tour performance, sales, inventory
- **Navigation Tabs:**
  - 📊 **Projections** → `/tours/[id]/projections`
  - 📈 **Reports** → `/tours/[id]/reports`
  - 📦 **Inventory** → `/tours/[id]/inventory`
  - 💰 **COGS** → `/tours/[id]/cogs`
  - ⚙️ **Warehouse Settings** → `/tours/[id]/settings/warehouses`

### Document Upload
- **URL:** `/upload`
- **Purpose:** Upload and parse PDFs (POs, packing lists, sales reports, settlements)
- **Actions:** Select tour, select document type, drop PDF

---

## 📊 Projections System

### Projection Sheet
- **URL:** `/tours/[id]/projections`
- **Purpose:** AI-powered sales forecasting with warehouse allocations
- **Features:**
  - Generate AI projections based on historical data
  - Manually adjust forecasts by SKU, size, and warehouse location
  - View inventory gaps and stockout warnings
  - Export to CSV

### Warehouse Settings
- **URL:** `/tours/[id]/settings/warehouses`
- **Purpose:** Manage warehouse locations for stock allocation
- **Features:**
  - View template locations (Road, Warehouse, Web)
  - Add custom locations (e.g., "Chicago Hub", "LA Warehouse")
  - Rename and reorder locations
  - Activate/deactivate locations

---

## 📈 Reporting System

### Reports Page
- **URL:** `/tours/[id]/reports`
- **Purpose:** Generate comprehensive tour reports
- **Features:**
  - Create new reports with customizable sections
  - Choose report type (Post-Tour Breakdown, Sales Analysis, Inventory Summary)
  - Select which sections to include (7 available)
  - View/delete existing reports

### Report Viewer
- **URL:** `/tours/[id]/reports/[reportId]`
- **Purpose:** View interactive report with charts and data
- **Sections:**
  1. **Cover Page** - Tour name, dates, show count
  2. **Product Breakdown** - Product grid with sales data (images if uploaded)
  3. **Event Tees** - Separate view for event-specific products
  4. **Gross Sales Report** - Bar chart by city
  5. **Per Heads Report** - $/head bar chart by city
  6. **Product Ratios** - "1 in X" purchase metrics table
  7. **Product % Breakdown** - Pie chart of product mix
- **Actions:**
  - Print to PDF (Cmd+P or "Print Report" button)
  - Return to reports list

---

## 📦 Inventory & COGS

### Inventory Page
- **URL:** `/tours/[id]/inventory`
- **Purpose:** View real-time inventory balances
- **Features:**
  - Units received, sold, comps, balance
  - Unit cost and total inventory value
  - Filter and search

### COGS Page
- **URL:** `/tours/[id]/cogs`
- **Purpose:** View cost of goods sold and margins
- **Features:**
  - Sales, costs, margins by SKU and size
  - Gross margin calculations
  - Profitability analysis

---

## 🎨 Product Images (Grab Sheets)

### Current Status
- **Storage:** Supabase Storage bucket `product-images` (configured ✅)
- **Upload Interface:** Coming soon
- **Display:** Product images automatically appear in reports once uploaded

### How to Add Images (When Available)
1. Navigate to product management (interface to be built)
2. Upload grab sheet images (PNG, JPG, GIF, WebP, max 10MB)
3. Set one image as "primary"
4. Images will appear in report Product Breakdown sections

### Why Images Don't Show Yet
- **Product upload UI not built** - Need to create product detail page with image upload
- **No images uploaded** - Even with UI, need to upload grab sheets for each product
- **Reports ready** - Once images are uploaded, they'll automatically display in reports

---

## 🔧 Settings

### Warehouse Settings
- **URL:** `/tours/[id]/settings/warehouses`
- **Purpose:** Configure warehouse locations for projection allocations
- **Template Locations:**
  - Road (touring stock)
  - Warehouse (main storage)
  - Web (online store)
- **Custom Locations:** Add as needed (e.g., city-specific hubs)

---

## 🚀 Quick Access

### From Dashboard
1. Click tour name → Tour Detail Page
2. Use navigation tabs at top to access features

### From Tour Detail
- **Projections:** Click "📊 Projections" tab OR "Open sheet" link in Projections panel
- **Reports:** Click "📈 Reports" tab
- **Warehouse Settings:** Click "⚙️ Warehouse Settings" tab
- **Upload Documents:** Click "Upload document" links in various sections

### From Anywhere
- Use browser back button or "← Back to Tour" links

---

## 🎯 Common Workflows

### Create a Sales Forecast
1. Go to `/tours/[id]/projections`
2. Click "Generate AI Projections"
3. Review and adjust warehouse allocations
4. Export to CSV if needed

### Generate a Tour Report
1. Go to `/tours/[id]/reports`
2. Click "Generate Report"
3. Customize report title and sections
4. Click "Generate Report"
5. Click "View Report" to see results
6. Click "Print Report" to save as PDF

### Upload Sales Data
1. Go to `/upload`
2. Select tour from dropdown
3. Select document type (Sales Report)
4. Drop PDF file
5. Review parsed data
6. Approve to post to database

### Configure Warehouses
1. Go to `/tours/[id]/settings/warehouses`
2. View existing locations
3. Click "Add Custom Location"
4. Enter name (e.g., "Miami Hub")
5. Click "Create Location"
6. Use in projection allocations

---

## 📝 Notes

- **Product images:** Upload interface coming soon
- **PDF export:** Reports can be printed to PDF from browser
- **Data sync:** All pages use real-time data from Supabase
- **Permissions:** RLS policies ensure data security

---

## 🐛 Troubleshooting

### "Reports showing no product images"
- **Cause:** No images uploaded yet
- **Solution:** Product image upload UI needs to be built (future feature)
- **Workaround:** Reports work perfectly without images, showing data in clean card layout

### "Can't find warehouse settings"
- **Location:** `/tours/[id]/settings/warehouses`
- **Access:** Click "⚙️ Warehouse Settings" tab on tour detail page

### "Projections not generating"
- **Requirement:** Tour must have historical sales data
- **Check:** Verify tour has shows and products with sales in database
- **Solution:** Upload sales reports first via `/upload`

---

Last updated: 2026-01-25
