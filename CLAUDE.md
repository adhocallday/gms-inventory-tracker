# Claude Code Guidelines for GMS Inventory Tracker

This document provides guidelines for AI assistants (Claude Code, Cursor, etc.) working on this codebase.

---

## Deployment Rules (CRITICAL)

### Branch Workflow

1. **NEVER push directly to `main` or `production` branch**
2. **Always push to `staging` branch first**
3. **Only deploy to production when explicitly requested by the user**

```
Feature Branch → staging → (user approval) → main/production
```

### Git Commands

```bash
# Create feature branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/your-feature-name

# Push to staging (safe)
git push origin staging

# NEVER do this without explicit user approval:
# git push origin main
# git push origin production
```

### Pre-Push Checklist

- [ ] Code tested locally (`npm run dev`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No secrets in code (check for API keys, passwords)
- [ ] Changes pushed to `staging` branch first

---

## Environment Variables

### Never Commit Secrets

These files should NEVER be committed:
- `.env.local`
- `.env`
- `.env.production`
- Any file containing API keys

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude AI
ANTHROPIC_API_KEY=your_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Before Committing

Always check for exposed secrets:
```bash
# Search for potential secrets
grep -r "sk-" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "eyJ" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "AKIA" --include="*.ts" --include="*.tsx" --include="*.js"
```

---

## Security Guidelines

### Database (Supabase)

1. **All new tables MUST have RLS enabled**
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "policy_name" ON new_table ...
   ```

2. **Prefer anon key over service role key** for user-facing routes
   - Service role bypasses RLS
   - Only use service role for admin/background tasks

3. **Check RLS status** before modifying tables
   - See `SECURITY.md` for current RLS status

### API Routes

1. **Validate input** on all API routes
2. **Check authorization** before data access (when auth is implemented)
3. **Log errors** but don't expose internal details to clients
4. **Rate limit** sensitive endpoints

### File Uploads

1. Validate file types and sizes
2. Use Supabase Storage with proper bucket policies
3. Never store sensitive files publicly

---

## Code Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Define interfaces for all data structures
- Avoid `any` type where possible

### Next.js

- Use App Router patterns
- Server components by default
- Client components only when needed (`'use client'`)

### Supabase

- Use typed client when possible
- Handle errors explicitly
- Use transactions for multi-table operations

---

## Vercel Deployment

### Initial Setup (One-time)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link project (run in project root)
vercel link
```

### Branch Deployments

Vercel automatically deploys:
- **`main` branch** → Production (gms-inventory-tracker.vercel.app)
- **`staging` branch** → Preview (gms-inventory-tracker-staging.vercel.app)
- **Other branches** → Preview URLs (auto-generated)

### Useful Vercel Commands

```bash
# Check login status
vercel whoami

# Deploy to preview (staging)
vercel

# Deploy to production (requires explicit flag)
vercel --prod

# List deployments
vercel ls

# Check project info
vercel inspect

# Pull environment variables
vercel env pull .env.local

# View logs
vercel logs [deployment-url]
```

### Environment Variables in Vercel

Set these in Vercel Dashboard → Project → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`

**Important:** Set different values for Production vs Preview environments.

---

## Useful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint

# Database
npx supabase status  # Check Supabase status (requires Docker)

# Vercel
vercel               # Deploy to preview
vercel --prod        # Deploy to production

# Testing
npm run dev          # Manual testing on localhost:3000
```

---

## Project Structure

```
app/                 # Next.js App Router pages
  api/               # API routes
  (routes)/          # Page routes
components/          # React components
lib/                 # Shared utilities
  supabase/          # Supabase client
  ai/                # Claude AI integration
supabase/
  migrations/        # Database migrations
  seed.sql           # Seed data
scripts/             # Utility scripts
```

---

## Connections

| Service | Status | Notes |
|---------|--------|-------|
| Supabase | Connected | Database and storage |
| Vercel | CLI installed | Run `vercel login` to authenticate |
| Anthropic | Connected | Claude API for document parsing |
| GitHub | Connected | Repo: adhocallday/gms-inventory-tracker |

---

## Questions?

If you're unsure about:
- Deployment → Ask the user before pushing to main
- Security → Check SECURITY.md
- Architecture → Check existing patterns in codebase
