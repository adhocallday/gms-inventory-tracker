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
        <p className="g-kicker">MerchFlow</p>
        <h1 className="text-3xl font-bold">MerchFlow POS demo</h1>
        <p className="max-w-3xl text-[15px] text-[var(--color-text-secondary)]">
          A clickable mock of the iPad app: setup, a sale by card, cash or split, and the settlement at close.
          It uses the tour catalog from the tracker (read-only). Nothing you do here is saved.
        </p>
      </header>
      <PosMockDemo />
    </div>
  );
}
