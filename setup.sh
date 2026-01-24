#!/bin/bash

echo "🚀 GMS Inventory Tracker - Setup Script"
echo "========================================"
echo ""

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔧 Step 2: Setting up environment variables..."
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    echo "✅ Created .env.local file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your credentials:"
    echo "   - Supabase URL and keys"
    echo "   - Anthropic API key"
    echo ""
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📋 Step 3: Next steps..."
echo ""
echo "1. Set up Supabase:"
echo "   - Go to https://supabase.com/dashboard"
echo "   - Create a new project named 'gms-inventory-tracker'"
echo "   - Run the SQL migration from /mnt/user-data/outputs/sample_seed_data.sql"
echo "   - Create Storage bucket 'documents' with folders: po/, packing-list/, sales-report/, settlement/"
echo ""
echo "2. Get API keys:"
echo "   - Supabase: Dashboard → Settings → API"
echo "   - Anthropic: https://console.anthropic.com"
echo ""
echo "3. Update .env.local with your keys"
echo ""
echo "4. Run the development server:"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:3000"
echo ""
echo "✨ Done! Check README.md for more details."
