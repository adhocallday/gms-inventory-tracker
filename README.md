# GMS Inventory Tracker

Multi-tour merchandise inventory management system with AI-powered document parsing.

## 🚀 Quick Start

### 1. Install Dependencies

Since we're in a restricted environment, you'll need to run this on your local machine:

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name it "gms-inventory-tracker"
4. Choose a region and set a strong database password
5. Wait for project to be created (~2 minutes)

### 3. Create Database Tables

In your Supabase project:
1. Go to SQL Editor
2. Copy the schema from `supabase/migrations/001_initial_schema.sql`
3. Run the migration (the CREATE TABLE statements and views)

Optional seed data:
1. Copy `supabase/seed.sql`
2. Run it after the schema to load sample records

### 4. Configure Storage

In Supabase Dashboard:
1. Go to Storage
2. Create a new bucket called "documents"
3. Set it to require authentication
4. Create folders: `po/`, `packing-list/`, `sales-report/`, `settlement/`

### 5. Get API Keys

In Supabase Dashboard → Settings → API:
- Copy your Project URL
- Copy your anon/public key
- Copy your service_role key (keep secret!)

### 6. Get Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to API Keys
4. Create a new key
5. Copy it (you won't see it again!)

### 7. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
ANTHROPIC_API_KEY=sk-ant-xxxxx...
```

### 8. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
gms-inventory-tracker/
├── app/                    # Next.js App Router
│   ├── api/
│   │   └── parse-document/ # AI parsing endpoint
│   ├── upload/            # Upload pages
│   │   ├── po/
│   │   ├── packing-list/
│   │   ├── sales-report/
│   │   └── settlement/
│   ├── layout.tsx
│   └── page.tsx           # Dashboard
├── components/
│   └── upload/
│       └── FileDropzone.tsx
├── lib/
│   ├── supabase/
│   │   └── client.ts      # Supabase client
│   └── ai/
│       ├── claude-client.ts
│       └── parsers/       # Document parsers
│           ├── po-parser.ts
│           ├── packing-list-parser.ts
│           ├── sales-report-parser.ts
│           └── settlement-parser.ts
├── supabase
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
└── package.json
```

## 🧪 Testing the AI Parsers

1. Go to [http://localhost:3000/upload](http://localhost:3000/upload)
2. Drag and drop a PO PDF
3. Watch it upload and parse!
4. See the extracted JSON data

## 🎯 What's Working

- ✅ File upload to Supabase Storage
- ✅ AI parsing of POs, packing lists, sales reports, settlements
- ✅ JSON extraction from any PDF format
- ✅ Error handling and loading states
- ✅ Clean UI with Tailwind CSS

## 🚧 What's Next

- [ ] Save parsed data to database
- [ ] PO/Packing list reconciliation
- [ ] Inventory balance calculations
- [ ] Tours management UI
- [ ] Excel-like inventory grid
- [ ] Charts and reports

## 📖 Documentation

See `README.md` and `supabase/migrations/001_initial_schema.sql` for current setup details.

## 🐛 Troubleshooting

### "Network request failed"
- Check your Supabase URL and keys in `.env.local`
- Make sure Supabase project is running

### "Anthropic API error"
- Check your API key in `.env.local`
- Make sure you have credits in your Anthropic account

### "File upload failed"
- Check Supabase Storage bucket exists
- Check bucket permissions (should require auth)
- Check file size (max 5MB)

## 📝 License

Proprietary - Global Merch Services
