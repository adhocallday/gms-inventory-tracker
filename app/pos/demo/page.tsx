import type { Metadata } from 'next';
import { PosMockDemo } from '@/components/pos-mock/PosMockDemo';

export const metadata: Metadata = {
  title: 'MerchFlow POS demo · MerchFlow Tracker',
  description: 'A browser mock of the MerchFlow POS iPad app, for review. Nothing is saved.',
};

export default function PosDemoPage() {
  return (
    <div className="space-y-5 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">MerchFlow POS demo</h1>
        <p className="max-w-3xl text-[15px] text-[var(--color-text-secondary)]">
          A clickable mock of the iPad app: setup, a sale by card, cash or split, and the settlement at close.
          It uses the tour catalog from the tracker (read-only). Nothing you do here is saved.
        </p>
      </header>
      <PosMockDemo />
    </div>
  );
}
