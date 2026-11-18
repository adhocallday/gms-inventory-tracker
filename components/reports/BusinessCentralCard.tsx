import { Landmark } from 'lucide-react';

/**
 * The planned Business Central connection, described where finance reads the
 * tour's reports. Static text: nothing here is built yet. The guided overview
 * anchors on its parts (bc-*).
 */
export function BusinessCentralCard() {
  return (
    <section
      data-tour="bc-card"
      aria-labelledby="bc-heading"
      className="mt-6 mb-6 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bc-heading" className="flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
          <Landmark className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
          Business Central connection
        </h2>
        <span
          data-tour="bc-status"
          className="rounded-full border border-[var(--color-bg-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]"
        >
          Planned: designed, not built yet
        </span>
      </div>
      <p className="mt-2 text-[var(--color-text-secondary)] max-w-[80ch]">
        Posted MerchFlow records will go to Microsoft Dynamics 365 Business Central through its REST API,
        authenticated with a Microsoft Entra ID app registration, so nobody re-keys sales, comps or receipts.
      </p>
      <dl className="mt-3 grid gap-3 md:grid-cols-2">
        <div data-tour="bc-map" className="rounded-md border border-[var(--color-bg-border)] p-3">
          <dt className="font-semibold text-[var(--color-text-primary)]">Mapped and validated before sending</dt>
          <dd className="mt-1 text-[var(--color-text-secondary)]">
            Each record is mapped to Business Central&apos;s schema (items, purchase orders and receipts, sales and
            comps) and checked against it. Records that fail go to the review queue, not to Business Central.
          </dd>
        </div>
        <div data-tour="bc-log" className="rounded-md border border-[var(--color-bg-border)] p-3">
          <dt className="font-semibold text-[var(--color-text-primary)]">Logged, and safe to resend</dt>
          <dd className="mt-1 text-[var(--color-text-secondary)]">
            Every push is logged with its source document. Sending a record twice does not create a duplicate, so
            Business Central can be reconciled against MerchFlow line by line.
          </dd>
        </div>
      </dl>
    </section>
  );
}
