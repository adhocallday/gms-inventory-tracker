import type { Metadata } from 'next';
import { MerchFlowWordmark } from '@/components/brand/MerchFlowLogo';
import { safeNext } from '@/lib/auth/safe-next';

export const metadata: Metadata = { title: 'Sign in · MerchFlow Tracker' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safeNext(searchParams.next) ?? '/';
  const failed = searchParams.error === '1';

  // Fixed overlay so the sign-in screen sits above the app shell (sidebar).
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-[var(--color-text-primary)]">
          <MerchFlowWordmark className="h-12 w-auto" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Sign in to MerchFlow Tracker</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Enter the access password to continue.</p>
        </div>
        <form action="/api/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              aria-invalid={failed || undefined}
              aria-describedby={failed ? 'password-error' : undefined}
              className="w-full h-11 rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-3 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] aria-[invalid=true]:border-[var(--color-red-primary)]"
            />
            {failed && (
              <p id="password-error" className="text-sm text-[var(--color-red-primary)]">
                Incorrect password. Check it and try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full h-11 rounded-md bg-[var(--color-red-primary)] text-sm font-semibold text-white hover:bg-[var(--color-red-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
