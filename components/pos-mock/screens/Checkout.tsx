'use client';

import { useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import {
  cartTotals,
  cashChangeCents,
  formatCents,
  isPaymentValid,
  QUICK_CASH_CENTS,
  splitCardCents,
  TIP_PERCENTS,
  tipCents,
  type PaymentType,
} from '../math';
import { newId, type Action, type PosState } from '../state';
import { Card, cx, MoneyInput, PrimaryButton, SecondaryButton } from '../ui';
import styles from '../pos-mock.module.css';

type Props = { state: PosState; dispatch: Dispatch<Action> };

/** Title bar used by each checkout step (checkoutHeader in CustomerCheckoutView). */
function CheckoutHeader({ title, onBack, backLabel = 'Back' }: { title: string; onBack?: () => void; backLabel?: string }) {
  return (
    <div className="relative flex h-[56px] shrink-0 items-center justify-center border-b border-[var(--border)] bg-[var(--surface)] px-4">
      {onBack && (
        <button type="button" onClick={onBack} className="absolute left-4 rounded-md px-2 py-1 text-[16px] font-medium text-[var(--red)]">
          {backLabel}
        </button>
      )}
      <h2 data-screen-title tabIndex={-1} className="text-[18px] font-semibold outline-none">
        {title}
      </h2>
    </div>
  );
}

function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-[620px] flex-1 overflow-y-auto px-6 py-8', className)}>{children}</div>;
}

function Amount({ label, cents, note }: { label: string; cents: number; note?: string }) {
  return (
    <div className="text-center">
      <p className="text-[17px] text-[var(--muted)]">{label}</p>
      <p className="text-[52px] font-bold leading-tight tabular-nums text-[var(--red)]">{formatCents(cents)}</p>
      {note && <p className="text-[15px] text-[var(--muted)]">{note}</p>}
    </div>
  );
}

function totalDue(state: PosState) {
  return cartTotals(state.cart).total + state.tip;
}

// ---------------------------------------------------------------------------

const METHODS: { type: PaymentType; title: string; subtitle: string; color: string; icon: string }[] = [
  { type: 'cash', title: 'Pay Cash', subtitle: 'Collect bills, calculate change', color: 'var(--success)', icon: 'M2 6h20v12H2zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M6 9v.01M18 15v.01' },
  { type: 'card', title: 'Pay by Card', subtitle: 'Tap, swipe, or insert card', color: 'var(--info)', icon: 'M2 5h20v14H2zM2 10h20M6 15h4' },
  { type: 'split', title: 'Split Payment', subtitle: 'Part cash, part card', color: 'var(--warn)', icon: 'M12 21V12M12 12L5 4M12 12l7-8M5 4v4M5 4h4M19 4v4M19 4h-4' },
];

export function PaymentMethodScreen({ state, dispatch }: Props) {
  const { total, units } = cartTotals(state.cart);
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Payment" onBack={() => dispatch({ type: 'go', screen: 'register' })} backLabel="Cancel" />
      <Body className="space-y-8">
        <Amount label="Total Due" cents={total} note={`${units} ${units === 1 ? 'item' : 'items'}, tax included`} />
        <div className="space-y-3">
          {METHODS.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => dispatch({ type: 'choosePayment', payType: m.type })}
              className="flex w-full items-center gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-5 py-[18px] text-left hover:border-[#c9cbd0]"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-11 shrink-0" fill="none" stroke={m.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={m.icon} />
              </svg>
              <span className="flex-1">
                <span className="block text-[18px] font-semibold">{m.title}</span>
                <span className="block text-[14px] text-[var(--muted)]">{m.subtitle}</span>
              </span>
              <span aria-hidden="true" className="text-[22px] text-[#b9bcc2]">›</span>
            </button>
          ))}
        </div>
      </Body>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function TipScreen({ state, dispatch }: Props) {
  const saleTotal = cartTotals(state.cart).total;
  const [customOpen, setCustomOpen] = useState(state.tipPercent === null && state.tip > 0);
  const customSelected = state.tipPercent === null && state.tip > 0;
  const next = state.payType === 'cash' ? 'cash' : state.payType === 'card' ? 'card' : 'split-cash';
  const nextLabel = state.payType === 'cash' ? 'Continue to Cash Payment' : state.payType === 'card' ? 'Continue to Card Payment' : 'Continue to Split Payment';

  const option = (selected: boolean, title: string, subtitle: string, onClick: () => void) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'rounded-[14px] px-3 py-5 text-center',
        selected ? 'bg-[var(--red)] text-white' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]'
      )}
    >
      <span className="block text-[22px] font-bold">{title}</span>
      <span className={cx('block text-[14px]', selected ? 'text-white/80' : 'text-[var(--muted)]')}>{subtitle}</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Add a Tip?" onBack={() => dispatch({ type: 'go', screen: 'method' })} />
      <Body className="space-y-6">
        <p className="text-center text-[16px] text-[var(--muted)]">
          Sale Total: <span className="font-semibold text-[var(--ink)]">{formatCents(saleTotal)}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TIP_PERCENTS.map((p) =>
            option(state.tipPercent === p, `${p}%`, formatCents(tipCents(p, saleTotal)), () =>
              dispatch({ type: 'tipPercent', percent: p, tip: tipCents(p, saleTotal) })
            )
          )}
          {option(state.tipPercent === null && state.tip === 0 && !customOpen, 'No Tip', '$0.00', () => {
            setCustomOpen(false);
            dispatch({ type: 'tipNone' });
          })}
          {option(customSelected || customOpen, 'Custom', customSelected ? formatCents(state.tip) : 'Enter amount', () => {
            setCustomOpen(true);
            dispatch({ type: 'tipNone' });
          })}
        </div>
        {customOpen && (
          <MoneyInput id="custom-tip" label="Custom tip" valueCents={state.tip} onChange={(c) => dispatch({ type: 'tipCustom', tip: c })} />
        )}
        {state.tip > 0 && (
          <div className="space-y-2 rounded-[12px] bg-[var(--surface)] p-4 text-[16px]">
            <div className="flex justify-between text-[var(--text2)]">
              <span>Tip</span>
              <span className="tabular-nums text-[var(--ink)]">{formatCents(state.tip)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
              <span>New Total</span>
              <span className="text-[20px] font-bold tabular-nums text-[var(--red)]">{formatCents(saleTotal + state.tip)}</span>
            </div>
          </div>
        )}
        <PrimaryButton className="w-full !py-4 text-[18px]" onClick={() => dispatch({ type: 'go', screen: next })}>
          {nextLabel}
        </PrimaryButton>
      </Body>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function CashScreen({ state, dispatch }: Props) {
  const due = totalDue(state);
  const change = cashChangeCents(state.tendered, due);
  const valid = isPaymentValid('cash', due, { tenderedCents: state.tendered });
  // Re-mount the text field when a quick amount is picked so it shows that value.
  const [fieldKey, setFieldKey] = useState(0);
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Cash Payment" onBack={() => dispatch({ type: 'go', screen: 'tip' })} />
      <Body className="space-y-6">
        <Amount label="Total Due" cents={due} note={state.tip > 0 ? `includes ${formatCents(state.tip)} tip` : undefined} />
        <div className="space-y-2">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">Quick Amounts</p>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_CASH_CENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={state.tendered === c}
                onClick={() => {
                  dispatch({ type: 'tender', cents: c });
                  setFieldKey((k) => k + 1);
                }}
                className={cx(
                  'rounded-[10px] border border-[var(--border)] py-3 text-[16px] font-bold',
                  state.tendered === c ? 'bg-[var(--red)] text-white' : 'bg-[var(--surface)]'
                )}
              >
                {formatCents(c).replace('.00', '')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'tender', cents: due });
              setFieldKey((k) => k + 1);
            }}
            className="text-[15px] font-medium text-[var(--red)] underline-offset-2 hover:underline"
          >
            Exact amount ({formatCents(due)})
          </button>
        </div>
        <MoneyInput key={fieldKey} id="cash-tendered" label="Cash Tendered" valueCents={state.tendered} onChange={(c) => dispatch({ type: 'tender', cents: c })} />
        <div className="space-y-1 rounded-[12px] bg-[var(--surface)] p-4 text-[16px]" aria-live="polite">
          <div className="flex justify-between text-[var(--text2)]">
            <span>Cash Tendered</span>
            <span className="tabular-nums text-[var(--ink)]">{formatCents(state.tendered)}</span>
          </div>
          <div className="flex items-baseline justify-between font-semibold">
            <span>Change Due</span>
            <span className={cx('text-[26px] font-bold tabular-nums', change > 0 ? 'text-[var(--success)]' : 'text-[#9ca3af]')}>{formatCents(change)}</span>
          </div>
        </div>
        <PrimaryButton className="w-full !py-4 text-[18px]" disabled={!valid} onClick={() => dispatch({ type: 'completeSale', id: newId(), at: Date.now() })}>
          Complete Sale
        </PrimaryButton>
      </Body>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Simulated card reader. No card data is entered or stored. */
function Reader({
  label,
  cents,
  note,
  idleText,
  actionLabel,
  onApproved,
  onBack,
}: {
  label: string;
  cents: number;
  note?: ReactNode;
  idleText: string;
  actionLabel: string;
  onApproved: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'processing' | 'approved'>('ready');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const tap = () => {
    setPhase('processing');
    timers.current.push(
      window.setTimeout(() => setPhase('approved'), 1100),
      window.setTimeout(onApproved, 1700)
    );
  };

  return (
    <Body className="flex flex-col items-center space-y-8 text-center">
      <div>
        <p className="text-[17px] text-[var(--muted)]">{label}</p>
        <p className="text-[52px] font-bold leading-tight tabular-nums text-[var(--red)]">{formatCents(cents)}</p>
        {note}
      </div>

      <div className="relative h-[200px] w-[200px]" aria-hidden="true">
        {phase !== 'approved' && (
          <>
            <span className={styles.ring} style={{ width: 200, height: 200 }} />
            <span className={styles.ring} style={{ width: 150, height: 150, animationDelay: '0.3s' }} />
            <span className={styles.ring} style={{ width: 100, height: 100, animationDelay: '0.6s' }} />
          </>
        )}
        <span className="absolute inset-0 m-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
          {phase === 'approved' ? (
            <svg viewBox="0 0 24 24" className={cx('h-10 w-10 text-[var(--success)]', styles.approved)} fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 12l5 5L20 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-[var(--info)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 7a7 7 0 0 1 0 10M12 4.5a11 11 0 0 1 0 15M4.5 9.5a3.5 3.5 0 0 1 0 5" />
            </svg>
          )}
        </span>
        {phase === 'processing' && (
          <span className={cx('absolute left-[58px] top-[30px] h-[56px] w-[88px] rounded-[8px] bg-[var(--ink)] shadow-lg', styles.tapCard)}>
            <span className="absolute left-2 top-3 h-3 w-4 rounded-sm bg-[#d4af37]" />
            <span className="absolute bottom-2 left-2 text-[9px] tracking-widest text-white/80">•••• 4242</span>
          </span>
        )}
      </div>

      <p className="text-[18px] text-[var(--text2)]" role="status">
        {phase === 'ready' ? idleText : phase === 'processing' ? 'Processing…' : 'Approved'}
      </p>

      <div className="w-full space-y-3">
        <PrimaryButton className="w-full !py-4 text-[18px]" disabled={phase !== 'ready'} onClick={tap}>
          {phase === 'ready' ? actionLabel : phase === 'processing' ? 'Processing…' : 'Approved'}
        </PrimaryButton>
        <SecondaryButton className="w-full" disabled={phase !== 'ready'} onClick={onBack}>
          Back
        </SecondaryButton>
        <p className="text-[13px] text-[var(--muted)]">Simulated reader. No card details are entered or sent.</p>
      </div>
    </Body>
  );
}

export function CardScreen({ state, dispatch }: Props) {
  const due = totalDue(state);
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Card Payment" />
      <Reader
        label="Total Charge"
        cents={due}
        note={state.tip > 0 ? <p className="text-[15px] text-[var(--muted)]">includes {formatCents(state.tip)} tip</p> : undefined}
        idleText="Tap, swipe, or insert card"
        actionLabel="Tap card (simulated)"
        onApproved={() => dispatch({ type: 'completeSale', id: newId(), at: Date.now() })}
        onBack={() => dispatch({ type: 'go', screen: 'tip' })}
      />
    </div>
  );
}

export function SplitCashScreen({ state, dispatch }: Props) {
  const due = totalDue(state);
  const card = splitCardCents(due, state.splitCash);
  const valid = isPaymentValid('split', due, { splitCashCents: state.splitCash });
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Split Payment" onBack={() => dispatch({ type: 'go', screen: 'tip' })} />
      <Body className="space-y-6">
        <Amount label="Total" cents={due} note={state.tip > 0 ? `includes ${formatCents(state.tip)} tip` : undefined} />
        <MoneyInput id="split-cash" label="Cash Amount" valueCents={state.splitCash} onChange={(c) => dispatch({ type: 'splitCash', cents: c })} />
        <div className="space-y-1 rounded-[12px] bg-[var(--surface)] p-4 text-[16px]" aria-live="polite">
          <div className="flex justify-between text-[var(--text2)]">
            <span>Cash Portion</span>
            <span className="tabular-nums text-[var(--ink)]">{formatCents(state.splitCash)}</span>
          </div>
          <div className="flex justify-between text-[var(--text2)]">
            <span>Card Portion</span>
            <span className="tabular-nums text-[var(--ink)]">{formatCents(card)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(due)}</span>
          </div>
        </div>
        {!valid && state.splitCash > 0 && <p className="text-[14px] text-[var(--warn)]">The cash part must be less than the total.</p>}
        <PrimaryButton className="w-full !py-4 text-[18px]" disabled={!valid} onClick={() => dispatch({ type: 'go', screen: 'split-card' })}>
          Collect Cash — Charge Card
        </PrimaryButton>
      </Body>
    </div>
  );
}

export function SplitCardScreen({ state, dispatch }: Props) {
  const due = totalDue(state);
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Charge Card" />
      <Reader
        label="Card Charge"
        cents={splitCardCents(due, state.splitCash)}
        note={<p className="text-[15px] font-medium text-[var(--success)]">✓ Cash collected: {formatCents(state.splitCash)}</p>}
        idleText="Present card to pay remaining amount"
        actionLabel="Tap card (simulated)"
        onApproved={() => dispatch({ type: 'completeSale', id: newId(), at: Date.now() })}
        onBack={() => dispatch({ type: 'go', screen: 'split-cash' })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

const PAYMENT_LABEL: Record<PaymentType, string> = { cash: 'Cash', card: 'Card', split: 'Split' };

export function ReceiptScreen({ state, dispatch }: Props) {
  const sale = state.sales.find((s) => s.id === state.lastSaleId);
  if (!sale) {
    return (
      <div className="p-10">
        <PrimaryButton onClick={() => dispatch({ type: 'newSale' })}>New Sale</PrimaryButton>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <CheckoutHeader title="Receipt" />
      <Body className="space-y-6">
        <div className="text-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-bg)]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <p className="text-[24px] font-bold">Sale Complete</p>
          <p className="text-[44px] font-bold tabular-nums text-[var(--red)]">{formatCents(sale.total)}</p>
        </div>
        <Card className="space-y-3 p-5 text-[15px]">
          <div className="flex justify-between text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">MerchFlow</span>
            <span>
              {sale.number} · {new Date(sale.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <ul className="space-y-1 border-t border-[var(--border)] pt-3">
            {sale.lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <span className="flex-1">
                  {l.name} <span className="text-[var(--muted)]">{l.size}</span>
                </span>
                <span className="w-8 text-[var(--muted)]">×{l.quantity}</span>
                <span className="w-20 text-right tabular-nums">{formatCents(l.unitCents * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-[var(--border)] pt-3 text-[var(--text2)]">
            <Line label="Subtotal" value={formatCents(sale.subtotal)} />
            <Line label="Tax" value={formatCents(sale.tax)} />
            {sale.tip > 0 && <Line label="Tip" value={formatCents(sale.tip)} />}
            <div className="flex justify-between text-[17px] font-bold text-[var(--ink)]">
              <span>Total</span>
              <span className="tabular-nums text-[var(--red)]">{formatCents(sale.total)}</span>
            </div>
          </div>
          <div className="space-y-1 border-t border-[var(--border)] pt-3 text-[var(--text2)]">
            <Line label="Payment" value={PAYMENT_LABEL[sale.paymentType]} />
            {sale.cardLastFour && <Line label="Card" value={`Visa ••••${sale.cardLastFour} (simulated)`} />}
            {sale.paymentType === 'cash' && <Line label="Cash Tendered" value={formatCents(sale.cashTendered ?? 0)} />}
            {sale.paymentType === 'cash' && <Line label="Change Given" value={formatCents(sale.cashChange ?? 0)} />}
            {sale.paymentType === 'split' && <Line label="Cash Portion" value={formatCents(sale.splitCash ?? 0)} />}
            {sale.paymentType === 'split' && <Line label="Card Portion" value={formatCents(sale.splitCard ?? 0)} />}
          </div>
        </Card>
        <PrimaryButton className="w-full !py-4 text-[18px]" onClick={() => dispatch({ type: 'newSale' })}>
          Done — New Sale
        </PrimaryButton>
      </Body>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums text-[var(--ink)]">{value}</span>
    </div>
  );
}
