import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Next.js 14 caches fetch() results on the server by default, and supabase-js
 * reads through fetch. API routes without a revalidate setting therefore kept
 * serving data from before a write (even across deploys). Opt every query out
 * of that cache; page-level `revalidate` still controls page caching.
 */
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch },
});

// For server-side operations requiring elevated privileges
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: noStoreFetch },
  });
}
