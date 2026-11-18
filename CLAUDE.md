# Claude Code Guidelines for MerchFlow Tracker (GMS Inventory Tracker)

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
- `MERCHFLOW_LINK_SECRET` (shared with MerchFlow Charts)
- `NEXT_PUBLIC_TRACKER_URL`, `NEXT_PUBLIC_CHARTS_URL`, `NEXT_PUBLIC_FLOW_URL`, `NEXT_PUBLIC_POS_URL` (optional; defaults in `lib/apps.ts`)

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

## AI Parsing (Golden Feature)

The AI-powered document parsing is the core feature of this application. Key details:

### Models Used
Model IDs live only in `lib/ai/models.ts` (`getModelForTask()`); never hardcode them elsewhere.
- **Haiku 4.5** (`claude-haiku-4-5`): document type classification (~3s)
- **Sonnet 5.5** (`claude-sonnet-5-5`): document parsing and chat
- **Opus 5.5** (`claude-opus-5-5`): projections and recommendations

### Architecture
```
lib/ai/
  claude-client.ts      # Core API client
  pdf-utils.ts          # PDF text extraction (pdf-parse v2)
  parsers/              # Document-specific parsers
    sales-report-parser.ts
    po-parser.ts
    packing-list-parser.ts
    settlement-parser.ts
  agents/               # Document agents with prompts
```

### Parsing Flow
1. **Upload**: PDFs over 4 MB go to the Supabase `documents` bucket via a signed URL
   (`/api/uploads/sign`), and routes receive `{ filePath }` instead of form data
   (`lib/ai/read-upload.ts`). This avoids Vercel's 4.5 MB body limit.
2. **Schema Parsing**: The PDF is sent as a `document` block with `output_config.format`
   (JSON schema structured outputs), streamed via `.finalMessage()`.
3. **Errors**: `AIParseError` carries a user-facing `message` plus `details`; routes return both.

### API rules for current models
- Do **not** use forced `tool_choice` (`tool`/`any`): it returns a 400 on Sonnet/Opus 5.5.
- No `temperature`, `budget_tokens`, or assistant prefill. Use `output_config.effort`.
- The first content block may be `thinking`: always find the `text` block, never `content[0]`.
- AI routes need `export const maxDuration = 300`.

### Common Issues
- **405 Error on Parse Routes**: Usually stale Vercel deployment - redeploy to fix
- **JSON Parse Errors**: Pass a schema to `parseDocument`/`parseText` for schema-valid output
- **Hydration Errors**: Use `mounted` state pattern for client-side-only rendering

---

## UI Patterns

### Theme System (MerchFlow brand)
- The app is **MerchFlow Tracker**, part of MerchFlow by Global Merchandising Services.
- **Light is the default.** Dark is opt-in through the theme toggle (`localStorage.theme = 'dark'`).
- Theme set via `data-theme` attribute on `<html>`; `:root` and `[data-theme="light"]` hold the light values, `[data-theme="dark"]` the dark ones.
- Inline script in `<head>` sets it before hydration to prevent a flash.
- Brand tokens (`--mf-*`) mirror `merchflow-brand/out/tokens.css`; the `--color-*` variables map onto them. Red `#E8003D` is an accent; white on it is 4.67:1 (AA), so red buttons with white text are fine. Hover/active go darker (`--color-red-hover` `#C70034`, `--color-red-active` `#A8002C`).
- Fonts: Inter (`--font-sans`) and Inconsolata (`--font-mono`).
- Don't hard-code dark-only classes (`border-white/10`, `bg-black/20`, `text-white` on surfaces); use the CSS variables.
- Logo: `components/brand/MerchFlowLogo.tsx` (inline, follows `currentColor`).

### MerchFlow links and onboarding
- App URLs live in `lib/apps.ts` (`NEXT_PUBLIC_TRACKER_URL`, `NEXT_PUBLIC_CHARTS_URL`, `NEXT_PUBLIC_FLOW_URL`, `NEXT_PUBLIC_POS_URL`).
- `GET /api/tours/[id]/merch-flow-data` serves TrackerData to MerchFlow Charts; it requires header `x-merchflow-link: $MERCHFLOW_LINK_SECRET` (same value set in both apps).
- First visit: `/` redirects to `/welcome` once (localStorage `mf.onboarding.v2`). The guided tour (driver.js) is `components/onboarding/GuidedTour.tsx`; its chapters and steps are in `components/onboarding/tour-chapters.ts`. Steps anchor on `data-tour="…"` attributes across most pages (NavBar, /welcome, tours, shows, upload, documents and review, inventory, COGS, projections, reports, admin, /pos), so keep those when editing. The tour's position is in sessionStorage (`mf.tour.state`); a missing anchor shows the step's `gap` text or is skipped.

### Collapsible Sidebar
- State managed via `SidebarContext`
- Collapsed state persisted in localStorage
- Key: `sidebar-collapsed`

### Hydration-Safe Components
```tsx
// Pattern for client-side-only rendering
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Placeholder />;
return <ActualComponent />;
```

### CSS Variables
```css
/* Use these for theme support */
--color-bg-base       /* Main background */
--color-bg-surface    /* Card/panel backgrounds */
--color-bg-elevated   /* Elevated elements */
--color-bg-border     /* Borders */
--color-text-primary  /* Main text */
--color-text-secondary /* Secondary text */
--color-text-muted    /* Muted/placeholder text */
--color-red-primary   /* Brand red */
```

---

## Questions?

If you're unsure about:
- Deployment → Ask the user before pushing to main
- Security → Check SECURITY.md
- Architecture → Check existing patterns in codebase
- AI Parsing → Check lib/ai/ directory and parsers
