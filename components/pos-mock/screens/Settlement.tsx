'use client';

import type { Dispatch } from 'react';
import {
  cashCollectedCents,
  compUnitsByKey,
  expectedClosing,
  formatCents,
  settle,
  soldUnitsByKey,
  type Counts,
} from '../math';
import type { Catalog } from '../catalog';
import { OPENING_BANK_CENTS, type Action, type PosState } from '../state';
import { Card, cx, Footer, Kpi, MoneyInput, PrimaryButton, Row, SecondaryButton, StepTitle } from '../ui';

type Props = { state: PosState; dispatch: Dispatch<Action>; catalog: Catalog; opening: Counts };

interface ActiveLine {
  key: string;
  name: string;
  size: string;
}

/** Item sizes that had a sale or a comp this session, in catalog order. */
function activeLines(catalog: Catalog, state: PosState): ActiveLine[] {
  const touched = new Set([...Object.keys(soldUnitsByKey(state.sales)), ...Object.keys(compUnitsByKey(state.comps))]);
  const out: ActiveLine[] = [];
  for (const item of catalog.items) {
    for (const s of item.sizes) {
      const key = `${item.id}::${s.size}`;
      if (touched.has(key)) out.push({ key, name: item.name, size: s.size });
    }
  }
  return out;
}

export function CountOutScreen({ state, dispatch, catalog, opening }: Props) {
  const sold = soldUnitsByKey(state.sales);
  const comped = compUnitsByKey(state.comps);
  const expected = expectedClosing(opening, state.sales, state.comps);
  const lines = activeLines(catalog, state);
  const otherCount = Object.keys(opening).length - lines.length;
  const expectedDrawer = OPENING_BANK_CENTS + cashCollectedCents(state.sales);
  const counted = state.countedDrawer ?? expectedDrawer;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-10 pt-7">
        <StepTitle
          title="Count-out"
          subtitle="Count what is left at the stand. Expected is the opening count minus sales and comps from this session."
        />
        <div className="grid grid-cols-[1.6fr_1fr] gap-5 group-data-[o=portrait]:grid-cols-1">
          <Card className="overflow-hidden">
            {lines.length === 0 ? (
              <p className="p-6 text-[var(--text2)]">No sales or comps yet. Every item is expected to match its opening count.</p>
            ) : (
              <table className="w-full text-left text-[15px]">
                <thead className="bg-[var(--surface)] text-[13px] uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Item</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Open</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Sold</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Comps</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Expected</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Counted</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const value = state.closing[l.key] ?? expected[l.key];
                    const diff = value - expected[l.key];
                    const label = `${l.name} ${l.size}`;
                    return (
                      <tr key={l.key} className="border-t border-[var(--border)]">
                        <th scope="row" className="px-4 py-2 font-normal">
                          <span className="font-semibold">{l.name}</span> <span className="text-[var(--muted)]">{l.size}</span>
                        </th>
                        <td className="px-2 py-2 text-right tabular-nums">{opening[l.key]}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{sold[l.key] ?? 0}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{comped[l.key] ?? 0}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{expected[l.key]}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label={`Counted one fewer ${label}`}
                              onClick={() => dispatch({ type: 'count', key: l.key, units: value - 1 })}
                              className="h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface)] leading-none"
                            >
                              −
                            </button>
                            <span className={cx('w-8 text-center font-semibold tabular-nums', diff !== 0 && 'text-[var(--warn)]')} aria-label={`${label} counted ${value}`}>
                              {value}
                            </span>
                            <button
                              type="button"
                              aria-label={`Counted one more ${label}`}
                              onClick={() => dispatch({ type: 'count', key: l.key, units: value + 1 })}
                              className="h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface)] leading-none"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="border-t border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--muted)]">
              {otherCount} other item sizes had no sales or comps and are taken as counted at their opening count.
            </p>
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="text-[18px] font-semibold">Cash drawer</h3>
            <div className="text-[15px]">
              <Row label="Opening bank" value={formatCents(OPENING_BANK_CENTS)} />
              <Row label="Cash sales (incl. split cash)" value={formatCents(cashCollectedCents(state.sales))} />
              <Row label="Expected in drawer" value={formatCents(expectedDrawer)} strong />
            </div>
            <MoneyInput
              id="drawer-count"
              label="Counted in drawer"
              valueCents={counted}
              onChange={(c) => dispatch({ type: 'drawer', cents: c })}
            />
            <p className="text-[13px] text-[var(--muted)]">Pre-filled with the expected amount. Change it to see a variance.</p>
          </Card>
        </div>
      </div>
      <Footer
        onBack={() => dispatch({ type: 'go', screen: 'register' })}
        backLabel="Back to register"
        primary={<PrimaryButton onClick={() => dispatch({ type: 'go', screen: 'settlement' })}>See settlement</PrimaryButton>}
      />
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${Math.abs(n) === 1 ? '' : 's'}`;

function variance(cents: number) {
  if (cents === 0) return { text: '✓ Match', tone: 'success' as const };
  const tone = Math.abs(cents) <= 500 ? ('warn' as const) : ('danger' as const);
  return { text: `${cents > 0 ? '+' : ''}${formatCents(cents)} ${cents > 0 ? 'over' : 'short'}`, tone };
}

export function SettlementScreen({ state, dispatch, catalog, opening }: Props) {
  const s = settle({
    opening,
    closing: state.closing,
    sales: state.sales,
    comps: state.comps,
    openingBank: OPENING_BANK_CENTS,
    countedDrawer: state.countedDrawer ?? OPENING_BANK_CENTS + cashCollectedCents(state.sales),
  });
  const cash = variance(s.cashVariance);
  const units =
    s.unitVariance === 0
      ? { text: '✓ Match', tone: 'success' as const }
      : { text: `${s.unitVariance > 0 ? '+' : ''}${plural(s.unitVariance, 'unit')}`, tone: 'danger' as const };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-10 pt-7">
        <StepTitle
          title="Settlement"
          subtitle={`${catalog.showName}. Calculated from the seeded opening count and every sale and comp recorded in this session.`}
        />
        <div className="grid grid-cols-4 gap-4 group-data-[o=portrait]:grid-cols-2">
          <Kpi label="Gross sales" value={formatCents(s.grossSales)} accent />
          <Kpi label="Sales tax" value={formatCents(s.tax)} />
          <Kpi label="Tips" value={formatCents(s.tips)} />
          <Kpi label="Total collected" value={formatCents(s.totalCollected)} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-[15px] group-data-[o=portrait]:grid-cols-1">
          <Card className="p-5">
            <h3 className="mb-2 text-[17px] font-semibold">Stock</h3>
            <Row label="Opening count" value={s.openingUnits.toLocaleString()} />
            <Row label="Units sold" value={s.unitsSold} />
            <Row label="Comps" value={s.unitsComped} />
            <Row label="Expected closing" value={s.expectedClosingUnits.toLocaleString()} />
            <Row label="Closing count" value={s.closingUnits.toLocaleString()} />
            <div className="mt-1 border-t border-[var(--border)] pt-1">
              <Row label="Unit variance" value={units.text} strong tone={units.tone} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 text-[17px] font-semibold">By payment type</h3>
            <Row label="Cash (to count in the drawer)" value={formatCents(s.cash)} />
            <Row label="Card" value={formatCents(s.card)} />
            <Row label="Transactions" value={s.transactions} />
            <div className="mt-1 border-t border-[var(--border)] pt-1">
              <Row label="Opening bank" value={formatCents(s.openingBank)} />
              <Row label="Expected drawer" value={formatCents(s.expectedDrawer)} />
              <Row label="Counted drawer" value={formatCents(s.countedDrawer)} />
              <Row label="Cash variance" value={cash.text} strong tone={cash.tone} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 text-[17px] font-semibold">Sales this session</h3>
            {state.sales.length === 0 ? (
              <p className="text-[var(--text2)]">No sales yet.</p>
            ) : (
              <ul className="max-h-[220px] space-y-1 overflow-y-auto">
                {state.sales.map((sale) => (
                  <li key={sale.id} className="flex justify-between gap-2">
                    <span className="text-[var(--text2)]">
                      {sale.paymentType[0].toUpperCase() + sale.paymentType.slice(1)} · {plural(sale.lines.reduce((n, l) => n + l.quantity, 0), 'unit')}
                    </span>
                    <span className="tabular-nums">{formatCents(sale.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            {state.comps.length > 0 && (
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-[var(--text2)]">
                {state.comps.length} comp {state.comps.length === 1 ? 'hand-off' : 'hand-offs'} ({plural(s.unitsComped, 'unit')})
              </p>
            )}
          </Card>
        </div>
        <p className="text-[14px] text-[var(--muted)]">
          This is a browser mock: the opening count is seeded (24–48 per apparel size, 30 per one-size item) and nothing is saved.
        </p>
      </div>
      <Footer
        onBack={() => dispatch({ type: 'go', screen: 'countout' })}
        secondary={<SecondaryButton onClick={() => dispatch({ type: 'go', screen: 'register' })}>Back to register</SecondaryButton>}
        primary={<PrimaryButton onClick={() => dispatch({ type: 'reset' })}>Finish and start over</PrimaryButton>}
      />
    </div>
  );
}
